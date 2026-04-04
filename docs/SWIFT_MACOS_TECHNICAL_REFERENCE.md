# Swift macOS Native App -- Technical Reference

Production-grade patterns for a native macOS app combining Claude Code GUI (subprocess management, NDJSON streaming, permission hooks) with a notch overlay UI (transparent windows, global hotkeys, dynamic geometry). Each section provides the recommended framework, a complete code skeleton, and documented gotchas.

---

## 1. Spawning and Managing CLI Subprocesses

### Recommended Framework

`Foundation.Process` + Swift concurrency (`AsyncStream`, `AsyncBytes`). The reference project (ClaudeIsland `ProcessExecutor.swift`) uses `withCheckedContinuation` to bridge the synchronous `Process` API into async. For a long-lived subprocess like `claude -p --output-format stream-json`, you need a streaming approach -- not `waitUntilExit()` followed by `readDataToEndOfFile()`, which blocks until the process finishes.

### Architecture

```swift
import Foundation
import os.log

/// Errors from managed subprocess lifecycle
enum SubprocessError: Error, LocalizedError {
    case launchFailed(underlying: Error)
    case commandNotFound(String)
    case terminated(exitCode: Int32, stderr: String)

    var errorDescription: String? {
        switch self {
        case .launchFailed(let e): return "Launch failed: \(e.localizedDescription)"
        case .commandNotFound(let cmd): return "Not found: \(cmd)"
        case .terminated(let code, let stderr): return "Exit \(code): \(stderr)"
        }
    }
}

/// A managed subprocess with streaming stdout/stderr and signal control.
actor ClaudeProcess {
    private let logger = Logger(subsystem: "com.app", category: "ClaudeProcess")

    private var process: Process?
    private var stdinPipe: Pipe?

    /// Ring buffer for stderr (last N lines for diagnostics)
    private var stderrRing: [String] = []
    private let maxStderrLines = 100

    /// The process exit code, set when the process terminates
    private var exitCode: Int32?

    // MARK: - Launch

    /// Spawn `claude -p` and return an AsyncStream of stdout lines.
    /// Each line is a complete NDJSON object.
    func start(
        claudeBinary: String = "/usr/local/bin/claude",
        arguments: [String] = ["-p", "--output-format", "stream-json", "--verbose"],
        cwd: String,
        environment: [String: String]? = nil
    ) throws -> AsyncStream<Data> {
        let proc = Process()
        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        let stdinPipe = Pipe()

        proc.executableURL = URL(fileURLWithPath: claudeBinary)
        proc.arguments = arguments
        proc.currentDirectoryURL = URL(fileURLWithPath: cwd)
        proc.standardOutput = stdoutPipe
        proc.standardError = stderrPipe
        proc.standardInput = stdinPipe

        if let env = environment {
            proc.environment = env
        }

        self.process = proc
        self.stdinPipe = stdinPipe

        // Stderr: read asynchronously into ring buffer
        stderrPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty,
                  let line = String(data: data, encoding: .utf8) else { return }
            Task { await self?.appendStderr(line) }
        }

        do {
            try proc.run()
            logger.info("Spawned claude PID \(proc.processIdentifier)")
        } catch let error as NSError where error.domain == NSCocoaErrorDomain && error.code == NSFileNoSuchFileError {
            throw SubprocessError.commandNotFound(claudeBinary)
        } catch {
            throw SubprocessError.launchFailed(underlying: error)
        }

        // Stdout: wrap FileHandle reads into AsyncStream, splitting on newlines
        let stream = AsyncStream<Data> { continuation in
            let handle = stdoutPipe.fileHandleForReading

            // Use readabilityHandler for non-blocking reads
            handle.readabilityHandler = { fileHandle in
                let data = fileHandle.availableData
                if data.isEmpty {
                    // EOF -- process closed stdout
                    continuation.finish()
                    handle.readabilityHandler = nil
                } else {
                    continuation.yield(data)
                }
            }

            // Clean up on cancellation
            continuation.onTermination = { @Sendable _ in
                handle.readabilityHandler = nil
            }
        }

        // Monitor process termination
        proc.terminationHandler = { [weak self] terminatedProcess in
            let code = terminatedProcess.terminationStatus
            Task { await self?.handleTermination(code: code) }
        }

        return stream
    }

    // MARK: - Stdin (send prompts to running process)

    /// Write a JSON message to stdin (for stream-json input format)
    func writeToStdin(_ message: Encodable) throws {
        guard let pipe = stdinPipe else { return }
        let data = try JSONEncoder().encode(message)
        pipe.fileHandleForWriting.write(data)
        pipe.fileHandleForWriting.write(Data("\n".utf8))
    }

    // MARK: - Signal Control

    /// Send SIGINT (graceful interrupt)
    func interrupt() {
        process?.interrupt() // sends SIGINT
        logger.info("Sent SIGINT to PID \(self.process?.processIdentifier ?? 0)")
    }

    /// Send SIGKILL after a timeout if SIGINT did not terminate
    func kill(afterTimeout: Duration = .seconds(5)) {
        interrupt()
        Task {
            try? await Task.sleep(for: afterTimeout)
            if self.process?.isRunning == true {
                self.process?.terminate() // sends SIGTERM
                logger.warning("Force-terminated PID \(self.process?.processIdentifier ?? 0)")
            }
        }
    }

    /// Force kill immediately (SIGKILL via Foundation is actually SIGTERM;
    /// for true SIGKILL you need Darwin.kill)
    func forceKill() {
        guard let pid = process?.processIdentifier else { return }
        Darwin.kill(pid, SIGKILL)
        logger.warning("Sent SIGKILL to PID \(pid)")
    }

    // MARK: - Diagnostics

    var stderrTail: [String] { stderrRing }
    var isRunning: Bool { process?.isRunning ?? false }
    var terminationStatus: Int32? { exitCode }

    // MARK: - Private

    private func appendStderr(_ line: String) {
        let lines = line.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        for l in lines where !l.isEmpty {
            stderrRing.append(l)
            if stderrRing.count > maxStderrLines {
                stderrRing.removeFirst()
            }
        }
    }

    private func handleTermination(code: Int32) {
        exitCode = code
        logger.info("Process exited with code \(code)")
    }
}
```

### Gotchas

1. **`readDataToEndOfFile()` blocks.** The ClaudeIsland `ProcessExecutor` calls `process.waitUntilExit()` then reads all data -- fine for one-shot commands, catastrophic for a long-lived streaming process. Use `readabilityHandler` or `AsyncBytes` instead.

2. **`Process.terminate()` sends SIGTERM, not SIGKILL.** For a true SIGKILL you must call `Darwin.kill(pid, SIGKILL)` directly.

3. **`Process.interrupt()` sends SIGINT.** This is what you want for graceful Claude Code cancellation.

4. **Pipe deadlocks.** If the process writes more to stdout/stderr than the pipe buffer (64KB on macOS), and you are not reading, the process blocks. Always install read handlers before calling `run()`.

5. **Binary discovery.** The CLUI-CC reference searches multiple paths (`/usr/local/bin/claude`, `/opt/homebrew/bin/claude`, `~/.npm-global/bin/claude`) and falls back to shell detection. Do the same.

6. **Environment inheritance.** By default `Process` inherits the app's environment, not the user's login shell. You need to either set `process.environment` explicitly with PATH or discover it from `/bin/zsh -ilc "env"`.

7. **Actor isolation for Process.** `Foundation.Process` is not Sendable. The actor pattern shown above isolates all mutation. The `terminationHandler` and `readabilityHandler` callbacks execute on arbitrary threads -- dispatch back into the actor with `Task { await self?.... }`.

---

## 2. NDJSON Stream Parsing

### Recommended Approach

Line-based buffering with `JSONDecoder` per line. The CLUI-CC `StreamParser` is the canonical pattern: accumulate chunks, split on `\n`, keep the last incomplete fragment in a buffer, parse each complete line.

### Architecture

```swift
import Foundation

/// Errors during NDJSON stream parsing
enum NDJSONParseError: Error {
    case invalidJSON(line: String, underlying: Error)
    case invalidUTF8
}

/// Parses NDJSON from a stream of Data chunks.
/// Handles partial lines, buffering, and typed decoding.
actor NDJSONParser<T: Decodable & Sendable> {
    private var buffer = Data()
    private let decoder: JSONDecoder
    private let newline = UInt8(ascii: "\n")

    init(decoder: JSONDecoder = JSONDecoder()) {
        self.decoder = decoder
    }

    /// Feed raw data from stdout, returns all complete parsed objects.
    func feed(_ chunk: Data) -> [Result<T, NDJSONParseError>] {
        buffer.append(chunk)

        var results: [Result<T, NDJSONParseError>] = []

        // Split on newlines, keeping incomplete tail in buffer
        while let newlineIndex = buffer.firstIndex(of: newline) {
            let lineData = buffer[buffer.startIndex..<newlineIndex]
            buffer = Data(buffer[(newlineIndex + 1)...]) // advance past newline

            // Skip empty lines
            guard !lineData.isEmpty else { continue }

            do {
                let parsed = try decoder.decode(T.self, from: Data(lineData))
                results.append(.success(parsed))
            } catch {
                let lineStr = String(data: Data(lineData), encoding: .utf8) ?? "<invalid utf8>"
                results.append(.failure(.invalidJSON(line: lineStr, underlying: error)))
            }
        }

        return results
    }

    /// Flush remaining buffer (call when stream ends).
    func flush() -> Result<T, NDJSONParseError>? {
        let remaining = buffer.trimmingWhitespace()
        buffer = Data()

        guard !remaining.isEmpty else { return nil }

        do {
            let parsed = try decoder.decode(T.self, from: remaining)
            return .success(parsed)
        } catch {
            let lineStr = String(data: remaining, encoding: .utf8) ?? "<invalid utf8>"
            return .failure(.invalidJSON(line: lineStr, underlying: error))
        }
    }
}

// MARK: - Data Extension

private extension Data {
    func trimmingWhitespace() -> Data {
        guard let start = self.firstIndex(where: { !$0.isASCIIWhitespace }),
              let end = self.lastIndex(where: { !$0.isASCIIWhitespace }) else {
            return Data()
        }
        return Data(self[start...end])
    }
}

private extension UInt8 {
    var isASCIIWhitespace: Bool {
        self == 0x20 || self == 0x09 || self == 0x0A || self == 0x0D
    }
}
```

### Typed Event Models

Map the Claude Code stream-json schema into Swift:

```swift
/// Top-level discriminated union for all Claude Code events
enum ClaudeEvent: Decodable, Sendable {
    case system(SystemEvent)
    case streamEvent(StreamEventPayload)
    case assistant(AssistantEvent)
    case result(ResultEvent)
    case permissionRequest(PermissionRequestEvent)
    case rateLimitEvent(RateLimitEvent)
    case unknown(type: String)

    private enum CodingKeys: String, CodingKey {
        case type
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "system":
            self = .system(try SystemEvent(from: decoder))
        case "stream_event":
            self = .streamEvent(try StreamEventPayload(from: decoder))
        case "assistant":
            self = .assistant(try AssistantEvent(from: decoder))
        case "result":
            self = .result(try ResultEvent(from: decoder))
        case "permission_request":
            self = .permissionRequest(try PermissionRequestEvent(from: decoder))
        case "rate_limit_event":
            self = .rateLimitEvent(try RateLimitEvent(from: decoder))
        default:
            self = .unknown(type: type)
        }
    }
}

struct SystemEvent: Decodable, Sendable {
    let subtype: String
    let sessionId: String?
    let cwd: String?
    let tools: [String]?
    let model: String?
    let claudeCodeVersion: String?

    enum CodingKeys: String, CodingKey {
        case subtype
        case sessionId = "session_id"
        case cwd, tools, model
        case claudeCodeVersion = "claude_code_version"
    }
}

struct ResultEvent: Decodable, Sendable {
    let subtype: String       // "success" or "error"
    let isError: Bool
    let durationMs: Int
    let numTurns: Int
    let result: String
    let totalCostUsd: Double
    let sessionId: String

    enum CodingKeys: String, CodingKey {
        case subtype
        case isError = "is_error"
        case durationMs = "duration_ms"
        case numTurns = "num_turns"
        case result
        case totalCostUsd = "total_cost_usd"
        case sessionId = "session_id"
    }
}

struct StreamEventPayload: Decodable, Sendable {
    let event: StreamSubEvent
    let sessionId: String
    let parentToolUseId: String?

    enum CodingKeys: String, CodingKey {
        case event
        case sessionId = "session_id"
        case parentToolUseId = "parent_tool_use_id"
    }
}

// Additional event types follow the same pattern from shared/types.ts
```

### Connecting Parser to Process

```swift
/// High-level integration: spawn claude, parse NDJSON, yield typed events
func startClaudeSession(
    cwd: String,
    prompt: String
) -> AsyncThrowingStream<ClaudeEvent, Error> {
    AsyncThrowingStream { continuation in
        Task {
            let process = ClaudeProcess()
            let parser = NDJSONParser<ClaudeEvent>()

            do {
                let dataStream = try await process.start(cwd: cwd)

                // Send initial prompt via stdin
                let userMessage = UserMessage(prompt: prompt)
                try await process.writeToStdin(userMessage)

                for await chunk in dataStream {
                    let results = await parser.feed(chunk)
                    for result in results {
                        switch result {
                        case .success(let event):
                            continuation.yield(event)
                        case .failure(let error):
                            // Log parse errors but don't terminate the stream
                            Logger.app.warning("Parse error: \(error)")
                        }
                    }
                }

                // Stream ended -- flush remaining buffer
                if let final = await parser.flush() {
                    if case .success(let event) = final {
                        continuation.yield(event)
                    }
                }

                continuation.finish()
            } catch {
                continuation.finish(throwing: error)
            }
        }
    }
}
```

### Gotchas

1. **Partial lines.** Stdout arrives in arbitrary-sized chunks that do not align with newlines. The buffer pattern above handles this. Never assume one `availableData` call equals one JSON line.

2. **Backpressure.** If your UI cannot keep up with parsing, events queue in memory. For very fast streams, consider dropping intermediate `text_delta` events and only keeping the latest.

3. **Unknown event types.** Claude Code may add new event types. The `.unknown(type:)` case prevents crashes from new schema versions.

4. **JSONDecoder reuse.** `JSONDecoder` is stateless -- reuse one instance across all lines. Do not create a new decoder per line.

5. **`stream-json` vs `stream-json` input.** For bidirectional communication, stdin also uses NDJSON. Each message is one JSON line terminated by `\n`. See the CLUI-CC `RunManager` for the exact stdin format: `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"..."}]}}`.

---

## 3. HTTP Server on Localhost (PreToolUse Hooks)

### Recommended Framework

Two viable approaches exist in the reference projects:

- **ClaudeIsland** uses a **Unix domain socket** (`AF_UNIX` + `SOCK_STREAM`) with raw POSIX calls and `DispatchSource`. This handles hook events from shell scripts that `echo` JSON and `socat` it to the socket.
- **CLUI-CC** uses a **localhost HTTP server** (`http.createServer`). Claude Code's native HTTP hook support POSTs JSON to `http://127.0.0.1:PORT/hook/pre-tool-use/<secret>/<token>`.

For our native app, the **HTTP approach** is correct because Claude Code hooks natively support HTTP URLs. Use Apple's Network framework (`NWListener`) for a lightweight, no-dependency HTTP server.

### Architecture

```swift
import Foundation
import Network
import os.log

/// A lightweight localhost HTTP server for Claude Code PreToolUse hooks.
/// Claude Code POSTs tool request JSON; we hold the connection open until
/// the user decides allow/deny, then respond with the hook response.
actor PermissionServer {
    private let logger = Logger(subsystem: "com.app", category: "PermissionServer")

    private var listener: NWListener?
    private var port: UInt16 = 0

    /// Per-launch app secret prevents local spoofing
    let appSecret = UUID().uuidString

    /// Per-run tokens map to tab/session context
    private var runTokens: [String: RunRegistration] = [:]

    /// Pending permission requests, keyed by questionId
    private var pendingRequests: [String: PendingPermission] = [:]

    /// Scoped "allow always" decisions
    private var scopedAllows: Set<String> = []

    struct RunRegistration: Sendable {
        let tabId: String
        let requestId: String
        let sessionId: String?
    }

    struct PendingPermission: Sendable {
        let toolRequest: HookToolRequest
        let connection: NWConnection
        let questionId: String
        let runToken: String
        let receivedAt: Date
    }

    /// Tool request from Claude Code hook
    struct HookToolRequest: Decodable, Sendable {
        let sessionId: String
        let cwd: String
        let hookEventName: String
        let toolName: String
        let toolInput: [String: AnyCodable]
        let toolUseId: String

        enum CodingKeys: String, CodingKey {
            case sessionId = "session_id"
            case cwd
            case hookEventName = "hook_event_name"
            case toolName = "tool_name"
            case toolInput = "tool_input"
            case toolUseId = "tool_use_id"
        }
    }

    // MARK: - Lifecycle

    func start() throws -> UInt16 {
        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true

        // Bind to localhost only
        let listener = try NWListener(using: parameters, on: .any)

        listener.stateUpdateHandler = { [weak self] state in
            Task { await self?.handleListenerState(state) }
        }

        listener.newConnectionHandler = { [weak self] connection in
            Task { await self?.handleConnection(connection) }
        }

        listener.start(queue: .global(qos: .userInitiated))
        self.listener = listener

        // Wait briefly for port assignment
        // In production, use a continuation pattern instead
        if let port = listener.port {
            self.port = port.rawValue
            logger.info("Permission server listening on 127.0.0.1:\(port.rawValue)")
            return port.rawValue
        }

        return 0
    }

    func stop() {
        // Deny all pending requests
        for (_, pending) in pendingRequests {
            sendHTTPResponse(
                connection: pending.connection,
                body: denyResponse(reason: "Server shutting down")
            )
        }
        pendingRequests.removeAll()

        listener?.cancel()
        listener = nil
    }

    // MARK: - Run Registration

    func registerRun(tabId: String, requestId: String, sessionId: String?) -> String {
        let token = UUID().uuidString
        runTokens[token] = RunRegistration(tabId: tabId, requestId: requestId, sessionId: sessionId)
        return token
    }

    func unregisterRun(token: String) {
        // Deny any pending requests for this run
        let matching = pendingRequests.filter { $0.value.runToken == token }
        for (qid, pending) in matching {
            sendHTTPResponse(
                connection: pending.connection,
                body: denyResponse(reason: "Run ended")
            )
            pendingRequests.removeValue(forKey: qid)
        }
        runTokens.removeValue(forKey: token)
    }

    // MARK: - Settings File Generation

    /// Generate a per-run Claude Code settings file pointing to our hook URL.
    func generateSettingsFile(runToken: String) throws -> URL {
        let hookURL = "http://127.0.0.1:\(port)/hook/pre-tool-use/\(appSecret)/\(runToken)"

        let settings: [String: Any] = [
            "hooks": [
                "PreToolUse": [
                    [
                        "matcher": "^(Bash|Edit|Write|MultiEdit|mcp__.*)$",
                        "hooks": [
                            [
                                "type": "http",
                                "url": hookURL,
                                "timeout": 300
                            ]
                        ]
                    ]
                ]
            ]
        ]

        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("app-hook-config", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        let file = dir.appendingPathComponent("hook-\(runToken).json")
        let data = try JSONSerialization.data(withJSONObject: settings, options: .prettyPrinted)
        try data.write(to: file)

        // Restrict permissions
        try FileManager.default.setAttributes(
            [.posixPermissions: 0o600],
            ofItemAtPath: file.path
        )

        return file
    }

    // MARK: - Permission Response

    func respondToPermission(questionId: String, decision: String, reason: String? = nil) {
        guard let pending = pendingRequests.removeValue(forKey: questionId) else {
            logger.warning("No pending request for \(questionId)")
            return
        }

        let body: [String: Any]
        if decision == "allow" || decision == "allow-session" {
            // Track scoped allows
            if decision == "allow-session" {
                let key = "session:\(pending.toolRequest.sessionId):tool:\(pending.toolRequest.toolName)"
                scopedAllows.insert(key)
            }
            body = allowResponse(reason: reason ?? "Approved by user")
        } else {
            body = denyResponse(reason: reason ?? "Denied by user")
        }

        sendHTTPResponse(connection: pending.connection, body: body)
    }

    // MARK: - Connection Handling (Private)

    private func handleConnection(_ connection: NWConnection) {
        connection.start(queue: .global(qos: .userInitiated))

        // Read the full HTTP request
        connection.receive(minimumIncompleteLength: 1, maximumLength: 1_048_576) {
            [weak self] data, _, isComplete, error in
            Task {
                await self?.processHTTPRequest(connection: connection, data: data, error: error)
            }
        }
    }

    private func processHTTPRequest(connection: NWConnection, data: Data?, error: NWError?) {
        guard let data = data else {
            connection.cancel()
            return
        }

        // Parse HTTP request (minimal parser -- NWListener gives raw TCP)
        guard let request = String(data: data, encoding: .utf8) else {
            sendHTTPResponse(connection: connection, statusCode: 400, body: denyResponse(reason: "Invalid request"))
            return
        }

        // Extract method, path, and body
        let lines = request.components(separatedBy: "\r\n")
        guard let requestLine = lines.first else {
            sendHTTPResponse(connection: connection, statusCode: 400, body: denyResponse(reason: "Empty request"))
            return
        }

        let parts = requestLine.split(separator: " ")
        guard parts.count >= 2, parts[0] == "POST" else {
            sendHTTPResponse(connection: connection, statusCode: 404, body: denyResponse(reason: "Not found"))
            return
        }

        let path = String(parts[1])
        let segments = path.split(separator: "/").map(String.init)

        // Validate: /hook/pre-tool-use/<appSecret>/<runToken>
        guard segments.count == 4,
              segments[0] == "hook",
              segments[1] == "pre-tool-use",
              segments[2] == appSecret else {
            sendHTTPResponse(connection: connection, statusCode: 403, body: denyResponse(reason: "Forbidden"))
            return
        }

        let runToken = segments[3]
        guard runTokens[runToken] != nil else {
            sendHTTPResponse(connection: connection, statusCode: 403, body: denyResponse(reason: "Unknown run"))
            return
        }

        // Extract JSON body (after blank line)
        guard let bodyStart = request.range(of: "\r\n\r\n")?.upperBound,
              let bodyData = String(request[bodyStart...]).data(using: .utf8),
              let toolRequest = try? JSONDecoder().decode(HookToolRequest.self, from: bodyData) else {
            sendHTTPResponse(connection: connection, statusCode: 400, body: denyResponse(reason: "Invalid JSON"))
            return
        }

        // Check scoped allows (auto-approve previously allowed tools)
        let sessionKey = "session:\(toolRequest.sessionId):tool:\(toolRequest.toolName)"
        if scopedAllows.contains(sessionKey) {
            sendHTTPResponse(connection: connection, body: allowResponse(reason: "Session-allowed"))
            return
        }

        // Hold connection open -- store as pending permission
        let questionId = "hook-\(Date().timeIntervalSince1970)-\(UUID().uuidString.prefix(8))"
        let pending = PendingPermission(
            toolRequest: toolRequest,
            connection: connection,
            questionId: questionId,
            runToken: runToken,
            receivedAt: Date()
        )
        pendingRequests[questionId] = pending

        // Notify UI (via callback or Notification)
        NotificationCenter.default.post(
            name: .permissionRequested,
            object: nil,
            userInfo: [
                "questionId": questionId,
                "toolName": toolRequest.toolName,
                "toolInput": toolRequest.toolInput,
                "toolUseId": toolRequest.toolUseId
            ]
        )

        // Timeout: auto-deny after 5 minutes
        Task {
            try? await Task.sleep(for: .minutes(5))
            if self.pendingRequests[questionId] != nil {
                self.respondToPermission(questionId: questionId, decision: "deny", reason: "Timed out")
            }
        }
    }

    // MARK: - HTTP Response Helpers

    private func sendHTTPResponse(
        connection: NWConnection,
        statusCode: Int = 200,
        body: [String: Any]
    ) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: body) else {
            connection.cancel()
            return
        }

        let response = "HTTP/1.1 \(statusCode) OK\r\nContent-Type: application/json\r\nContent-Length: \(jsonData.count)\r\nConnection: close\r\n\r\n"
        var responseData = Data(response.utf8)
        responseData.append(jsonData)

        connection.send(content: responseData, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    private func allowResponse(reason: String) -> [String: Any] {
        [
            "hookSpecificOutput": [
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "permissionDecisionReason": reason
            ]
        ]
    }

    private func denyResponse(reason: String) -> [String: Any] {
        [
            "hookSpecificOutput": [
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason
            ]
        ]
    }

    private func handleListenerState(_ state: NWListener.State) {
        switch state {
        case .ready:
            if let port = listener?.port {
                self.port = port.rawValue
            }
        case .failed(let error):
            logger.error("Listener failed: \(error)")
        default:
            break
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let permissionRequested = Notification.Name("permissionRequested")
}
```

### Alternative: Use Hummingbird or Swifter

If you want proper HTTP parsing without writing your own (the `NWListener` approach above requires manual HTTP parsing), consider:

- **Hummingbird** (swift-server ecosystem, async/await native, lightweight)
- **Swifter** (tiny single-file HTTP server, perfect for this use case)
- **swift-nio** (if you already use Vapor dependencies)

For a macOS app that only needs one endpoint, Hummingbird or even raw NWListener is fine. If you go with NWListener, you are responsible for HTTP parsing yourself.

### Gotchas

1. **Connection lifetime.** The key pattern is holding the HTTP connection open until the user decides. Claude Code's hook has a configurable timeout (300s in the reference). Do not close the connection prematurely.

2. **Per-run secrets.** Both reference projects use per-launch + per-run tokens in the URL to prevent other local processes from injecting decisions. Always do this.

3. **Settings file lifecycle.** Generate a temp settings JSON pointing to your hook URL, pass it via `--settings` to the claude process, and delete it when the run ends.

4. **Loopback only.** Bind to `127.0.0.1`, never `0.0.0.0`. The permission server must not be network-accessible.

5. **The hook response format is specific.** Claude Code expects `hookSpecificOutput.permissionDecision` to be `"allow"` or `"deny"`. The `hookEventName` must match. Get this wrong and Claude silently ignores the response.

6. **Safe command auto-approval.** The CLUI-CC reference auto-approves read-only Bash commands without prompting. Port the `isSafeBashCommand` logic for good UX.

---

## 4. Local Speech-to-Text

### Recommended Framework

**WhisperKit** for on-device transcription on Apple Silicon. Falls back to Apple's `Speech` framework for Intel or when WhisperKit is unavailable.

### WhisperKit Setup

```swift
import AVFoundation
import WhisperKit

actor SpeechTranscriber {
    private var whisperKit: WhisperKit?
    private var audioEngine: AVAudioEngine?
    private var audioBuffer: [Float] = []

    /// Initialize WhisperKit with a model
    func setup(model: String = "base.en") async throws {
        whisperKit = try await WhisperKit(
            model: model,
            verbose: false,
            logLevel: .none
        )
    }

    /// Start recording from the microphone
    func startRecording() throws {
        let engine = AVAudioEngine()
        let inputNode = engine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Ensure mono 16kHz for Whisper
        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: 16000,
            channels: 1,
            interleaved: false
        ) else {
            throw TranscriptionError.invalidAudioFormat
        }

        let converter = AVAudioConverter(from: recordingFormat, to: targetFormat)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) {
            [weak self] buffer, _ in
            guard let converter = converter else { return }

            let frameCount = AVAudioFrameCount(
                Double(buffer.frameLength) * 16000.0 / buffer.format.sampleRate
            )

            guard let convertedBuffer = AVAudioPCMBuffer(
                pcmFormat: targetFormat,
                frameCapacity: frameCount
            ) else { return }

            var error: NSError?
            converter.convert(to: convertedBuffer, error: &error) { _, outStatus in
                outStatus.pointee = .haveData
                return buffer
            }

            if let channelData = convertedBuffer.floatChannelData?[0] {
                let samples = Array(UnsafeBufferPointer(
                    start: channelData,
                    count: Int(convertedBuffer.frameLength)
                ))
                Task { await self?.appendSamples(samples) }
            }
        }

        engine.prepare()
        try engine.start()
        self.audioEngine = engine
    }

    /// Stop recording and transcribe
    func stopAndTranscribe() async throws -> String {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine = nil

        guard let whisper = whisperKit else {
            throw TranscriptionError.notInitialized
        }

        guard !audioBuffer.isEmpty else {
            throw TranscriptionError.noAudio
        }

        let samples = audioBuffer
        audioBuffer = []

        let result = try await whisper.transcribe(audioArray: samples)
        return result.map(\.text).joined(separator: " ").trimmingCharacters(in: .whitespaces)
    }

    private func appendSamples(_ samples: [Float]) {
        audioBuffer.append(contentsOf: samples)
    }
}

enum TranscriptionError: Error {
    case notInitialized
    case noAudio
    case invalidAudioFormat
}
```

### Apple Speech Framework Fallback

```swift
import Speech

actor AppleSpeechTranscriber {
    private var recognizer: SFSpeechRecognizer?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine: AVAudioEngine?
    private var request: SFSpeechAudioBufferRecognitionRequest?

    func requestAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }

    func startLiveTranscription(
        onPartialResult: @escaping @Sendable (String) -> Void
    ) throws {
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        let engine = AVAudioEngine()
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true

        // On-device recognition (macOS 13+)
        if #available(macOS 13.0, *) {
            request.requiresOnDeviceRecognition = true
        }

        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        engine.prepare()
        try engine.start()

        recognitionTask = recognizer?.recognitionTask(with: request) { result, error in
            if let result = result {
                onPartialResult(result.bestTranscription.formattedString)
            }
        }

        self.audioEngine = engine
        self.request = request
    }

    func stop() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        recognitionTask?.cancel()
    }
}
```

### Gotchas

1. **Microphone permission.** Add `NSMicrophoneUsageDescription` to Info.plist. Without it, the app crashes on first audio access.

2. **WhisperKit model download.** Models are 40-150MB. Download on first launch, show progress, cache locally. The `base.en` model is the best tradeoff of speed vs accuracy for English.

3. **Apple Silicon only.** WhisperKit uses CoreML and runs well on M1+. On Intel Macs, fall back to the Speech framework.

4. **Audio format conversion.** Whisper expects 16kHz mono float32. The microphone typically outputs 44.1/48kHz stereo. The `AVAudioConverter` handles this.

5. **Speech framework rate limit.** Apple's SFSpeechRecognizer has per-device and per-app limits for server-based recognition. Use `requiresOnDeviceRecognition = true` on macOS 13+ to avoid this.

6. **Background audio.** For a menu bar / notch app, you may not have audio session priority. Call `AVAudioSession` configuration before starting the engine (though on macOS, audio session management is simpler than iOS).

---

## 5. Transparent Click-Through Windows

### Recommended Framework

`NSPanel` with `.nonactivatingPanel` style. The ClaudeIsland `NotchPanel` is the definitive reference for this pattern.

### Architecture

```swift
import AppKit

/// A transparent, always-on-top panel that passes clicks through
/// transparent regions to windows behind it.
class OverlayPanel: NSPanel {
    override init(
        contentRect: NSRect,
        styleMask style: NSWindow.StyleMask,
        backing backingStoreType: NSWindow.BackingStoreType,
        defer flag: Bool
    ) {
        super.init(
            contentRect: contentRect,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        // Floating panel -- does not steal focus
        isFloatingPanel = true
        becomesKeyOnlyIfNeeded = true

        // Transparent window chrome
        isOpaque = false
        titleVisibility = .hidden
        titlebarAppearsTransparent = true
        backgroundColor = .clear
        hasShadow = false

        // Immovable
        isMovable = false

        // Behavior: visible on all spaces, above menu bar, not in Expose
        collectionBehavior = [
            .fullScreenAuxiliary,
            .stationary,
            .canJoinAllSpaces,
            .ignoresCycle
        ]

        // Z-level: above menu bar
        level = .mainMenu + 3

        // CRITICAL: Start with mouse events ignored.
        // Global event monitors handle hover/click detection.
        // Toggle this dynamically when the panel "opens" for interaction.
        ignoresMouseEvents = true

        isReleasedWhenClosed = true
        acceptsMouseMovedEvents = false
    }

    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}
```

### Dynamic Click-Through Toggling

The ClaudeIsland approach: the window **always** ignores mouse events. Global event monitors detect hover/click in the notch area and toggle the panel state. When the panel is "open" and showing interactive content, you have two options:

**Option A (ClaudeIsland approach):** Keep `ignoresMouseEvents = true` always, use global monitors for all interaction. This is simpler but means you cannot use standard SwiftUI controls directly -- you must translate global mouse events into UI actions.

**Option B (Recommended for a full GUI):** Toggle `ignoresMouseEvents` based on whether the panel is expanded:

```swift
/// When panel opens for interaction, enable mouse events
func openPanel() {
    panel.ignoresMouseEvents = false
    // Animate panel expansion...
}

/// When panel closes, pass clicks through again
func closePanel() {
    panel.ignoresMouseEvents = true
    // Animate panel collapse...
}
```

**Option C (Per-pixel hit testing):** Override `sendEvent` to check whether the click hits an actual view:

```swift
override func sendEvent(_ event: NSEvent) {
    switch event.type {
    case .leftMouseDown, .leftMouseUp, .rightMouseDown, .rightMouseUp:
        let location = event.locationInWindow
        if let contentView = self.contentView,
           contentView.hitTest(location) == nil {
            // Nothing wants this click -- pass through
            ignoresMouseEvents = true
            DispatchQueue.main.async { [weak self] in
                self?.repostClick(event, at: self?.convertPoint(toScreen: location) ?? .zero)
            }
            return
        }
    default:
        break
    }
    super.sendEvent(event)
}

private func repostClick(_ event: NSEvent, at screenPoint: NSPoint) {
    guard let screen = NSScreen.main else { return }
    // Convert AppKit coordinates (Y from bottom) to CGEvent (Y from top)
    let cgPoint = CGPoint(x: screenPoint.x, y: screen.frame.height - screenPoint.y)

    let mouseType: CGEventType
    switch event.type {
    case .leftMouseDown: mouseType = .leftMouseDown
    case .leftMouseUp: mouseType = .leftMouseUp
    case .rightMouseDown: mouseType = .rightMouseDown
    case .rightMouseUp: mouseType = .rightMouseUp
    default: return
    }

    let button: CGMouseButton = (event.type == .rightMouseDown || event.type == .rightMouseUp) ? .right : .left

    if let cgEvent = CGEvent(mouseEventSource: nil, mouseType: mouseType, mouseCursorPosition: cgPoint, mouseButton: button) {
        cgEvent.post(tap: .cghidEventTap)
    }
}
```

### Gotchas

1. **Coordinate systems.** AppKit uses Y-from-bottom (origin at bottom-left). CGEvent uses Y-from-top. Always convert when re-posting clicks.

2. **`NSPanel` vs `NSWindow`.** You must use `NSPanel` with `.nonactivatingPanel` for the overlay to not steal focus from other apps. A regular `NSWindow` will activate your app on click.

3. **`.canJoinAllSpaces`** makes the window appear on all virtual desktops. Combined with `.stationary`, it does not move during space transitions.

4. **`.level = .mainMenu + 3`** places the window above the menu bar but below the screen saver level. Adjust if you need different Z ordering.

5. **Accessibility permission.** If you post CGEvents (for click pass-through), your app needs the Accessibility permission in System Preferences. Without it, `cgEvent.post()` silently fails.

6. **Animation with transparent windows.** SwiftUI animations work normally inside the panel. Use `.animation(.spring(), value: isExpanded)` on the content view.

---

## 6. macOS Notch Geometry

### Recommended Framework

`NSScreen` APIs -- specifically `safeAreaInsets` (macOS 12+) and `auxiliaryTopLeftArea` / `auxiliaryTopRightArea` (macOS 12+).

### Architecture

The ClaudeIsland `Ext+NSScreen.swift` is the reference implementation:

```swift
import AppKit

extension NSScreen {
    /// The physical notch dimensions on this screen.
    /// Returns a sensible default for non-notch displays.
    var notchSize: CGSize {
        guard safeAreaInsets.top > 0 else {
            // Non-notch display -- return a default widget size
            return CGSize(width: 224, height: 38)
        }

        let notchHeight = safeAreaInsets.top
        let fullWidth = frame.width
        let leftPadding = auxiliaryTopLeftArea?.width ?? 0
        let rightPadding = auxiliaryTopRightArea?.width ?? 0

        guard leftPadding > 0, rightPadding > 0 else {
            return CGSize(width: 180, height: notchHeight)
        }

        // +4 correction matches boring.notch / NotchDrop alignment
        let notchWidth = fullWidth - leftPadding - rightPadding + 4
        return CGSize(width: notchWidth, height: notchHeight)
    }

    /// Whether this is the built-in display (MacBook screen)
    var isBuiltinDisplay: Bool {
        guard let id = deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID else {
            return false
        }
        return CGDisplayIsBuiltin(id) != 0
    }

    /// The built-in display, or main screen as fallback
    static var builtin: NSScreen? {
        screens.first(where: \.isBuiltinDisplay) ?? NSScreen.main
    }

    /// Whether this screen has a physical camera notch
    var hasPhysicalNotch: Bool {
        safeAreaInsets.top > 0
    }
}
```

### Positioning the Window

```swift
/// Calculate the window frame to cover the notch area and expansion zone
func windowFrame(for screen: NSScreen) -> NSRect {
    let notch = screen.notchSize
    let screenFrame = screen.frame

    // Window spans the full width and enough height for the expanded panel
    let maxExpandedHeight: CGFloat = 600
    let windowWidth = min(screenFrame.width * 0.6, 700)

    return NSRect(
        x: screenFrame.midX - windowWidth / 2,
        y: screenFrame.maxY - maxExpandedHeight,
        width: windowWidth,
        height: maxExpandedHeight
    )
}
```

### Multi-Monitor Handling

```swift
/// Select the appropriate screen for the notch overlay
func selectScreen(preference: ScreenPreference) -> NSScreen? {
    switch preference {
    case .automatic:
        // Prefer built-in display (has the notch)
        return NSScreen.builtin

    case .specific(let savedIdentifier):
        // Find saved screen by display ID or name
        return NSScreen.screens.first { screen in
            if let id = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID,
               id == savedIdentifier.displayID {
                return true
            }
            return screen.localizedName == savedIdentifier.name
        } ?? NSScreen.builtin
    }
}

enum ScreenPreference {
    case automatic
    case specific(SavedScreen)
}

struct SavedScreen {
    let displayID: CGDirectDisplayID?
    let name: String
}
```

### Screen Change Observation

```swift
/// Watch for display configuration changes (plug/unplug monitors)
class ScreenObserver {
    private var observer: NSObjectProtocol?

    init(onChange: @escaping () -> Void) {
        observer = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { _ in
            onChange()
        }
    }

    deinit {
        if let observer = observer {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}
```

### Gotchas

1. **External monitors have no notch.** `safeAreaInsets.top` is 0 on external displays. Decide whether to show the overlay differently (centered at top, or as a standard window).

2. **The +4 correction.** Multiple notch overlay apps (boring.notch, NotchDrop, ClaudeIsland) all add 4 points to the calculated notch width for pixel-perfect alignment. This appears to be an off-by-one in Apple's reported auxiliary areas.

3. **Scale factor.** On Retina displays, `frame.width` is in points, not pixels. The notch APIs work in points, so no conversion is needed for window positioning.

4. **Display ID instability.** `CGDirectDisplayID` can change when a monitor is unplugged and re-plugged. The ClaudeIsland `ScreenSelector` falls back to `localizedName` matching as a secondary identifier.

5. **Clamshell mode.** When the MacBook lid is closed with an external monitor, `NSScreen.builtin` returns nil. Handle this gracefully.

6. **Screen parameters notification.** `NSApplication.didChangeScreenParametersNotification` fires for resolution changes, new displays, and display removal. Recreate the window on this notification.

---

## 7. Global Hotkey Registration

### Recommended Framework

`NSEvent.addGlobalMonitorForEvents` for a no-entitlement approach. `CGEvent` tap for more control. `Carbon.RegisterEventHotKey` (legacy but reliable) for proper system-wide hotkeys that work even when no NSApplication is frontmost.

### Modern Approach (NSEvent monitors)

```swift
import AppKit

/// Registers a global keyboard shortcut to toggle the app panel
class GlobalHotkeyManager {
    private var globalMonitor: Any?
    private var localMonitor: Any?
    private let action: () -> Void

    /// The hotkey combination (e.g., Option+Space)
    let keyCode: UInt16
    let modifierFlags: NSEvent.ModifierFlags

    init(
        keyCode: UInt16 = 49, // Space
        modifiers: NSEvent.ModifierFlags = .option,
        action: @escaping () -> Void
    ) {
        self.keyCode = keyCode
        self.modifierFlags = modifiers
        self.action = action
    }

    func start() {
        // Monitor events outside our app
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handleKeyEvent(event)
        }

        // Monitor events inside our app
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handleKeyEvent(event)
            return event
        }
    }

    func stop() {
        if let monitor = globalMonitor {
            NSEvent.removeMonitor(monitor)
            globalMonitor = nil
        }
        if let monitor = localMonitor {
            NSEvent.removeMonitor(monitor)
            localMonitor = nil
        }
    }

    private func handleKeyEvent(_ event: NSEvent) {
        // Check both key code and exact modifier flags
        let relevantModifiers: NSEvent.ModifierFlags = [.shift, .control, .option, .command]
        let pressedModifiers = event.modifierFlags.intersection(relevantModifiers)

        if event.keyCode == keyCode && pressedModifiers == modifierFlags {
            action()
        }
    }

    deinit {
        stop()
    }
}
```

### CGEvent Tap Approach (Lower Level)

```swift
import CoreGraphics

/// Lower-level approach using CGEvent tap.
/// Requires Accessibility permission.
class CGEventHotkeyMonitor {
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private let action: () -> Void
    private let targetKeyCode: Int64
    private let targetModifiers: CGEventFlags

    init(keyCode: Int64 = 49, modifiers: CGEventFlags = .maskAlternate, action: @escaping () -> Void) {
        self.targetKeyCode = keyCode
        self.targetModifiers = modifiers
        self.action = action
    }

    func start() -> Bool {
        let callback: CGEventTapCallBack = { proxy, type, event, refcon in
            guard type == .keyDown else { return Unmanaged.passRetained(event) }

            let monitor = Unmanaged<CGEventHotkeyMonitor>.fromOpaque(refcon!).takeUnretainedValue()
            let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
            let flags = event.flags

            // Check if our hotkey was pressed
            let relevantFlags: CGEventFlags = [.maskShift, .maskControl, .maskAlternate, .maskCommand]
            let pressedFlags = flags.intersection(relevantFlags)

            if keyCode == monitor.targetKeyCode && pressedFlags == monitor.targetModifiers {
                DispatchQueue.main.async {
                    monitor.action()
                }
                return nil // Consume the event
            }

            return Unmanaged.passRetained(event)
        }

        let mask: CGEventMask = (1 << CGEventType.keyDown.rawValue)
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: mask,
            callback: callback,
            userInfo: selfPtr
        ) else {
            return false // Accessibility permission denied
        }

        eventTap = tap
        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)

        return true
    }

    func stop() {
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
            if let source = runLoopSource {
                CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
            }
        }
        eventTap = nil
        runLoopSource = nil
    }

    deinit {
        stop()
    }
}
```

### Gotchas

1. **`addGlobalMonitorForEvents` cannot consume events.** It is observe-only. The original app still receives the keystroke. Use CGEvent tap if you need to swallow the hotkey.

2. **Accessibility permission.** CGEvent taps require the Accessibility permission. `addGlobalMonitorForEvents` does not, but also cannot suppress events.

3. **Key code values.** Space = 49, Tab = 48, Return = 36, Escape = 53. These are hardware key codes, not character codes.

4. **Modifier matching.** Always mask out irrelevant modifiers (like `.capsLock`, `.numericPad`, `.function`). Only compare `.shift`, `.control`, `.option`, `.command`.

5. **Conflict with system hotkeys.** Option+Space is Spotlight on some configurations. Command+Space is Spotlight on others. Check for conflicts and let users customize.

6. **App Sandbox.** Global event monitoring does not work in a sandboxed app without the appropriate temporary exception entitlement. If distributing outside the Mac App Store, disable the sandbox or use the `com.apple.security.temporary-exception.apple-events` entitlement.

---

## 8. Centralized State Management in SwiftUI

### Recommended Framework

`@Observable` macro (Swift 5.9+, macOS 14+) with `@MainActor` isolation. This replaces `ObservableObject` + `@Published` with automatic fine-grained observation.

### Architecture

```swift
import SwiftUI
import os.log

// MARK: - Domain State

/// Immutable session state (value semantics)
struct SessionState: Identifiable, Equatable, Sendable {
    let id: String // sessionId
    var phase: SessionPhase
    var messages: [ChatMessage]
    var currentTool: String?
    var costUsd: Double
    var model: String?
}

enum SessionPhase: Equatable, Sendable {
    case idle
    case running
    case waitingForPermission(PermissionContext)
    case waitingForInput
    case compacting
    case completed
    case failed(String)
}

struct PermissionContext: Equatable, Sendable {
    let questionId: String
    let toolName: String
    let toolInput: [String: String]
}

struct ChatMessage: Identifiable, Equatable, Sendable {
    let id: String
    let role: MessageRole
    let content: String
    let timestamp: Date
    let toolName: String?
}

enum MessageRole: String, Sendable {
    case user, assistant, tool, system
}

// MARK: - App Store (Zustand equivalent)

/// Centralized app state. @Observable provides fine-grained SwiftUI subscriptions.
/// @MainActor ensures all mutations happen on the main thread.
@MainActor
@Observable
final class AppStore {
    // MARK: - State

    private(set) var sessions: [String: SessionState] = [:]
    private(set) var activeSessionId: String?
    private(set) var isRecording = false
    private(set) var panelState: PanelState = .closed

    // MARK: - Computed Properties (automatically tracked by @Observable)

    var activeSession: SessionState? {
        guard let id = activeSessionId else { return nil }
        return sessions[id]
    }

    var sortedSessions: [SessionState] {
        sessions.values.sorted { $0.messages.last?.timestamp ?? .distantPast > $1.messages.last?.timestamp ?? .distantPast }
    }

    var hasActivePermission: Bool {
        guard let session = activeSession else { return false }
        if case .waitingForPermission = session.phase { return true }
        return false
    }

    var totalCost: Double {
        sessions.values.reduce(0) { $0 + $1.costUsd }
    }

    // MARK: - Actions (all state mutations go through these)

    func processEvent(_ event: ClaudeEvent, sessionId: String) {
        var session = sessions[sessionId] ?? SessionState(
            id: sessionId,
            phase: .idle,
            messages: [],
            costUsd: 0
        )

        switch event {
        case .system(let sysEvent):
            if sysEvent.subtype == "init" {
                session.model = sysEvent.model
                session.phase = .running
            }

        case .result(let result):
            session.costUsd = result.totalCostUsd
            session.phase = result.isError ? .failed(result.result) : .completed

        case .permissionRequest(let perm):
            session.phase = .waitingForPermission(PermissionContext(
                questionId: perm.questionId,
                toolName: perm.toolName,
                toolInput: [:] // Map from AnyCodable
            ))

        default:
            break
        }

        // Immutable update
        sessions[sessionId] = session
    }

    func setActiveSession(_ id: String?) {
        activeSessionId = id
    }

    func appendMessage(_ message: ChatMessage, to sessionId: String) {
        guard var session = sessions[sessionId] else { return }
        // Immutable update: create new array
        session.messages = session.messages + [message]
        sessions[sessionId] = session
    }

    func togglePanel() {
        panelState = panelState == .closed ? .open : .closed
    }

    func setPanelState(_ state: PanelState) {
        panelState = state
    }

    func setRecording(_ recording: Bool) {
        isRecording = recording
    }
}

enum PanelState: Equatable {
    case closed
    case open
    case popping // brief notification animation
}
```

### View Integration

```swift
// The @Observable macro means views automatically re-render only
// when the specific properties they access change.
// No need for @ObservedObject or @EnvironmentObject wrappers.

struct ContentView: View {
    let store: AppStore

    var body: some View {
        // Only re-renders when panelState changes
        switch store.panelState {
        case .closed:
            ClosedNotchView(store: store)
        case .open:
            OpenPanelView(store: store)
        case .popping:
            PopNotificationView(store: store)
        }
    }
}

struct SessionListView: View {
    let store: AppStore

    var body: some View {
        // Only re-renders when sortedSessions changes
        ForEach(store.sortedSessions) { session in
            SessionRow(session: session)
                .onTapGesture {
                    store.setActiveSession(session.id)
                }
        }
    }
}

// Inject at app root
@main
struct MyApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        // For a menu bar / notch app, you typically don't use WindowGroup
        // Instead, manage windows manually via AppDelegate
        Settings {
            SettingsView(store: store)
        }
    }
}
```

### Gotchas

1. **`@Observable` vs `ObservableObject`.** `@Observable` (Swift 5.9+) provides automatic fine-grained tracking -- views only re-render when the specific properties they read change. `ObservableObject` + `@Published` re-renders on any property change. Always prefer `@Observable` for new code.

2. **`@MainActor` is critical.** Without it, SwiftUI views can crash from background-thread state mutations. The `@MainActor` annotation on the store ensures all mutations are main-thread.

3. **Immutable updates.** Even with `@Observable`, prefer creating new struct values rather than mutating in place. `sessions[id] = updatedSession` is better than `sessions[id]?.phase = .running` because it is explicit about what changed.

4. **No `@State` for shared stores.** `@State` is for view-local state. For the centralized store, pass it via `@Environment` or direct injection. With `@Observable`, you inject the store instance directly -- no property wrapper needed on the view side.

5. **Combine publishers for cross-actor communication.** The ClaudeIsland `SessionStore` is an actor that publishes state via a `CurrentValueSubject`. This is the right pattern when the store needs actor isolation (for processing events from background threads) and the UI needs to subscribe from `@MainActor`.

---

## 9. Markdown Rendering in SwiftUI

### Recommended Framework

Apple's `swift-markdown` package for parsing + custom SwiftUI renderer. The ClaudeIsland `MarkdownRenderer.swift` is a production-quality implementation of this approach.

### Options Comparison

| Approach | Pros | Cons |
|----------|------|------|
| `AttributedString(markdown:)` | Built-in, zero deps | No code block styling, no tables, limited control |
| `swift-markdown` + custom renderer | Full control, code blocks, tables | More code, maintain renderer |
| Third-party (MarkdownUI) | Feature-rich, code highlighting | Large dependency, may not match your design |

### Architecture (swift-markdown approach)

The ClaudeIsland renderer is already production-quality. Key additions for a Claude Code GUI:

```swift
import Markdown
import SwiftUI

// MARK: - Syntax Highlighted Code Block

struct SyntaxHighlightedCodeBlock: View {
    let code: String
    let language: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Language badge
            if let lang = language, !lang.isEmpty {
                HStack {
                    Text(lang)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(.secondary)
                    Spacer()
                    Button("Copy") {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(code, forType: .string)
                    }
                    .buttonStyle(.plain)
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.black.opacity(0.3))
            }

            // Code content
            ScrollView([.horizontal, .vertical], showsIndicators: true) {
                Text(code)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.white.opacity(0.9))
                    .textSelection(.enabled)
                    .padding(12)
            }
        }
        .background(Color(nsColor: NSColor(white: 0.1, alpha: 1.0)))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.white.opacity(0.1), lineWidth: 0.5)
        )
    }
}

// MARK: - Table Renderer

struct MarkdownTableView: View {
    let headers: [String]
    let rows: [[String]]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row
            HStack(spacing: 0) {
                ForEach(headers.indices, id: \.self) { i in
                    Text(headers[i])
                        .font(.system(size: 12, weight: .bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if i < headers.count - 1 {
                        Divider()
                    }
                }
            }
            .background(Color.white.opacity(0.08))

            Divider()

            // Data rows
            ForEach(rows.indices, id: \.self) { rowIndex in
                HStack(spacing: 0) {
                    ForEach(rows[rowIndex].indices, id: \.self) { colIndex in
                        Text(rows[rowIndex][colIndex])
                            .font(.system(size: 12))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        if colIndex < rows[rowIndex].count - 1 {
                            Divider()
                        }
                    }
                }
                if rowIndex < rows.count - 1 {
                    Divider()
                }
            }
        }
        .background(Color.white.opacity(0.04))
        .cornerRadius(6)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.white.opacity(0.1), lineWidth: 0.5)
        )
    }
}
```

### Document Caching

The ClaudeIsland approach of caching parsed `Document` objects is essential for performance:

```swift
/// Thread-safe cache for parsed markdown documents
final class MarkdownCache: @unchecked Sendable {
    static let shared = MarkdownCache()

    private var cache: [String: Document] = [:]
    private let lock = NSLock()
    private let maxEntries = 200

    func document(for markdown: String) -> Document {
        lock.lock()
        defer { lock.unlock() }

        if let cached = cache[markdown] {
            return cached
        }

        let doc = Document(parsing: markdown, options: [.parseBlockDirectives])

        // Evict if cache is full
        if cache.count >= maxEntries {
            cache.removeAll()
        }

        cache[markdown] = doc
        return doc
    }
}
```

### Gotchas

1. **`Text` concatenation for inline styles.** SwiftUI's `Text("a") + Text("b").bold()` is how you mix inline styles. The ClaudeIsland `InlineRenderer` demonstrates this pattern.

2. **swift-markdown dependency.** Add `apple/swift-markdown` to Package.swift. It is maintained by Apple and has no transitive dependencies.

3. **No native syntax highlighting.** `swift-markdown` parses markdown but does not syntax-highlight code. For syntax highlighting, use `swift-syntax` (for Swift code) or a regex-based highlighter. Alternatively, use `Highlightr` (wraps highlight.js).

4. **Performance with long documents.** Cache parsed documents. Avoid re-parsing the entire conversation on every keystroke delta. For streaming text, append to the last message and only re-parse that message.

5. **Text selection.** `.textSelection(.enabled)` works on macOS 12+ but can interfere with click-through behavior on transparent panels.

---

## 10. File/Screenshot Attachments

### File Picking

```swift
import AppKit
import UniformTypeIdentifiers

/// Present an open panel for file selection
@MainActor
func pickFiles() async -> [URL]? {
    let panel = NSOpenPanel()
    panel.allowsMultipleSelection = true
    panel.canChooseDirectories = false
    panel.canChooseFiles = true
    panel.allowedContentTypes = [
        .image, .pdf, .plainText, .sourceCode, .json,
        UTType(filenameExtension: "md")!,
        UTType(filenameExtension: "swift")!,
        UTType(filenameExtension: "py")!,
    ]

    let response = await panel.begin()
    guard response == .OK else { return nil }
    return panel.urls
}
```

### Screenshot Capture

```swift
import CoreGraphics
import AppKit

/// Capture a screenshot of the entire screen or a specific window
func captureScreenshot(interactive: Bool = true) async -> NSImage? {
    if interactive {
        // Use screencapture utility for interactive selection
        return await captureWithScreencapture()
    } else {
        // Programmatic full-screen capture
        return captureFullScreen()
    }
}

/// Interactive screenshot using macOS screencapture tool
private func captureWithScreencapture() async -> NSImage? {
    let tempURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("screenshot-\(UUID().uuidString).png")

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    process.arguments = ["-i", "-x", tempURL.path] // -i = interactive, -x = no sound

    do {
        try process.run()
        process.waitUntilExit()

        guard process.terminationStatus == 0,
              let image = NSImage(contentsOf: tempURL) else {
            return nil
        }

        // Clean up temp file
        try? FileManager.default.removeItem(at: tempURL)
        return image
    } catch {
        return nil
    }
}

/// Programmatic full-screen capture
private func captureFullScreen() -> NSImage? {
    guard let displayID = NSScreen.main?.deviceDescription[
        NSDeviceDescriptionKey("NSScreenNumber")
    ] as? CGDirectDisplayID else {
        return nil
    }

    guard let cgImage = CGDisplayCreateImage(displayID) else {
        return nil
    }

    return NSImage(cgImage: cgImage, size: NSSize(
        width: cgImage.width,
        height: cgImage.height
    ))
}

/// Capture a specific window by ID
func captureWindow(windowID: CGWindowID) -> NSImage? {
    guard let cgImage = CGWindowListCreateImage(
        .null,
        .optionIncludingWindow,
        windowID,
        [.boundsIgnoreFraming, .nominalResolution]
    ) else {
        return nil
    }

    return NSImage(cgImage: cgImage, size: NSSize(
        width: cgImage.width,
        height: cgImage.height
    ))
}
```

### Attachment Chip UI

```swift
struct AttachmentChip: View {
    let attachment: Attachment
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            // Thumbnail
            if let image = attachment.thumbnail {
                Image(nsImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 24, height: 24)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            } else {
                Image(systemName: attachment.iconName)
                    .font(.system(size: 12))
                    .frame(width: 24, height: 24)
            }

            // Filename
            Text(attachment.name)
                .font(.system(size: 11))
                .lineLimit(1)
                .truncationMode(.middle)

            // Remove button
            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.08))
        .cornerRadius(6)
    }
}

struct Attachment: Identifiable {
    let id = UUID()
    let name: String
    let url: URL
    let type: AttachmentType
    var thumbnail: NSImage?

    var iconName: String {
        switch type {
        case .image: return "photo"
        case .code: return "doc.text"
        case .pdf: return "doc.richtext"
        case .other: return "doc"
        }
    }

    enum AttachmentType {
        case image, code, pdf, other
    }
}
```

### Gotchas

1. **`NSOpenPanel` must run on main thread.** Use `await panel.begin()` from a `@MainActor` context.

2. **`CGDisplayCreateImage` requires Screen Recording permission.** Without it, the call returns nil. Check `CGPreflightScreenCaptureAccess()` and request with `CGRequestScreenCaptureAccess()`.

3. **Interactive screencapture.** The `/usr/sbin/screencapture -i` approach gives users the native selection tool. The process exits with code 1 if the user cancels (presses Escape).

4. **Base64 encoding for Claude.** Claude Code accepts image attachments as base64 data URLs. Convert: `"data:image/png;base64,\(imageData.base64EncodedString())"`.

5. **Pasteboard images.** For paste support, read from `NSPasteboard.general.readObjects(forClasses: [NSImage.self])`.

---

## 11. Electron-to-Swift IPC Patterns

If a hybrid approach is ever needed (Swift app communicating with a Node.js process):

### Unix Domain Sockets (Recommended)

The most natural bridge. Both Swift (via `NWConnection` or POSIX sockets) and Node.js (via `net.createConnection`) support Unix sockets natively.

```swift
import Network

/// Connect to a Node.js server via Unix domain socket
func connectToNode(socketPath: String) -> NWConnection {
    let endpoint = NWEndpoint.unix(path: socketPath)
    let connection = NWConnection(to: endpoint, using: .tcp)

    connection.stateUpdateHandler = { state in
        switch state {
        case .ready:
            print("Connected to Node.js")
        case .failed(let error):
            print("Connection failed: \(error)")
        default:
            break
        }
    }

    connection.start(queue: .global())
    return connection
}
```

### Local HTTP

Same as the permission server pattern. Node.js runs an HTTP server, Swift sends requests. Simple, debuggable, language-agnostic.

### stdio Pipes

If Swift spawns the Node.js process, use stdin/stdout pipes with NDJSON (same as the Claude Code subprocess pattern). This is the simplest approach when the Swift app owns the Node process lifecycle.

### Gotchas

1. **Mach ports** are macOS-specific and complex. Only use if you need kernel-level IPC performance. For a GUI app, Unix sockets or HTTP are sufficient.

2. **XPC** is the Apple-blessed IPC mechanism for sandboxed apps communicating with helper tools. It requires a separate XPC service target and is overkill for dev tooling.

3. **Message framing.** Unix sockets are stream-based, not message-based. Use NDJSON (newline-delimited) or length-prefixed messages to delineate boundaries.

---

## 12. Auto-Update System

### Recommended Framework

**Sparkle** (`sparkle-project/Sparkle`). The ClaudeIsland `AppDelegate` demonstrates the integration.

### Architecture

```swift
import Sparkle

/// App delegate setup for Sparkle auto-updates
class AppDelegate: NSObject, NSApplicationDelegate {
    let updater: SPUUpdater
    private let userDriver: SPUStandardUserDriver
    private var checkTimer: Timer?

    override init() {
        // Standard user driver shows the update UI
        userDriver = SPUStandardUserDriver(hostBundle: Bundle.main, delegate: nil)
        updater = SPUUpdater(
            hostBundle: Bundle.main,
            applicationBundle: Bundle.main,
            userDriver: userDriver,
            delegate: nil
        )
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            try updater.start()
        } catch {
            print("Sparkle start failed: \(error)")
        }

        // Check for updates on launch
        if updater.canCheckForUpdates {
            updater.checkForUpdatesInBackground()
        }

        // Periodic check every hour
        checkTimer = Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { [weak self] _ in
            guard let updater = self?.updater, updater.canCheckForUpdates else { return }
            updater.checkForUpdatesInBackground()
        }
    }
}
```

### Appcast Setup

Host an `appcast.xml` file (Sparkle's update feed format) at a stable URL. For GitHub releases:

```xml
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>MyApp</title>
    <item>
      <title>Version 1.1.0</title>
      <sparkle:version>42</sparkle:version>
      <sparkle:shortVersionString>1.1.0</sparkle:shortVersionString>
      <enclosure url="https://github.com/user/repo/releases/download/v1.1.0/MyApp.zip"
                 sparkle:edSignature="..."
                 length="12345678"
                 type="application/octet-stream" />
    </item>
  </channel>
</rss>
```

### Alternative: GitHub Releases API

```swift
/// Manual update check against GitHub releases
actor UpdateChecker {
    struct Release: Decodable {
        let tagName: String
        let htmlUrl: String
        let assets: [Asset]

        struct Asset: Decodable {
            let name: String
            let browserDownloadUrl: String

            enum CodingKeys: String, CodingKey {
                case name
                case browserDownloadUrl = "browser_download_url"
            }
        }

        enum CodingKeys: String, CodingKey {
            case tagName = "tag_name"
            case htmlUrl = "html_url"
            case assets
        }
    }

    func checkForUpdate(
        repo: String,
        currentVersion: String
    ) async throws -> Release? {
        let url = URL(string: "https://api.github.com/repos/\(repo)/releases/latest")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let release = try JSONDecoder().decode(Release.self, from: data)

        // Compare semver
        let latest = release.tagName.trimmingCharacters(in: CharacterSet(charactersIn: "v"))
        if latest.compare(currentVersion, options: .numeric) == .orderedDescending {
            return release
        }
        return nil
    }
}
```

### Gotchas

1. **Code signing.** Sparkle validates code signatures. Sign your app with a Developer ID certificate for updates to work.

2. **EdDSA signatures.** Sparkle 2.x uses EdDSA (not DSA) for update verification. Generate a key pair with `generate_keys` (bundled with Sparkle) and include the public key in Info.plist.

3. **Sandboxed apps.** Sparkle 2.x supports sandboxed apps via an XPC helper (`Installer.xpc`). Include it in your app bundle.

4. **Menu bar apps.** For apps without a standard window, use `SPUStandardUserDriver` or implement `SPUUserDriver` to show update alerts from a custom UI (like ClaudeIsland's `NotchUserDriver`).

5. **Notarization.** Apple requires notarization for apps distributed outside the Mac App Store. The update `.zip` must also be notarized.

---

## 13. Persistent Settings

### Recommended Approaches

| Approach | Best For | Thread Safety |
|----------|----------|---------------|
| `@AppStorage` | SwiftUI views, simple values | Main actor only |
| `UserDefaults` | Global access, any type | Thread-safe for reads, main thread for writes |
| Custom file | Complex structured settings | Manual |
| Keychain | Secrets (tokens, passwords) | Thread-safe |

### @AppStorage (SwiftUI-native)

```swift
struct SettingsView: View {
    @AppStorage("selectedModel") private var selectedModel = "claude-sonnet-4-20250514"
    @AppStorage("autoApproveReads") private var autoApproveReads = true
    @AppStorage("hotkeyEnabled") private var hotkeyEnabled = true
    @AppStorage("maxBudgetUsd") private var maxBudgetUsd = 5.0

    var body: some View {
        Form {
            Picker("Model", selection: $selectedModel) {
                Text("Sonnet").tag("claude-sonnet-4-20250514")
                Text("Opus").tag("claude-opus-4-20250514")
                Text("Haiku").tag("claude-haiku-4-20250514")
            }

            Toggle("Auto-approve read-only tools", isOn: $autoApproveReads)
            Toggle("Global hotkey (Option+Space)", isOn: $hotkeyEnabled)

            HStack {
                Text("Max budget per run")
                TextField("USD", value: $maxBudgetUsd, format: .currency(code: "USD"))
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 80)
            }
        }
    }
}
```

### Structured Settings with Codable

```swift
/// App settings backed by UserDefaults with Codable serialization
@MainActor
@Observable
final class Settings {
    static let shared = Settings()

    private let defaults = UserDefaults.standard
    private let key = "appSettings"

    // MARK: - Settings Properties

    var selectedModel: String = "claude-sonnet-4-20250514" { didSet { save() } }
    var autoApproveReads: Bool = true { didSet { save() } }
    var hotkeyKeyCode: UInt16 = 49 { didSet { save() } }
    var hotkeyModifiers: UInt = 0x00080000 { didSet { save() } } // .option
    var maxBudgetUsd: Double = 5.0 { didSet { save() } }
    var notificationSound: String = "Pop" { didSet { save() } }
    var screenSelectionMode: String = "automatic" { didSet { save() } }
    var savedScreenName: String? { didSet { save() } }

    // MARK: - Persistence

    private init() {
        load()
    }

    private func load() {
        guard let data = defaults.data(forKey: key),
              let saved = try? JSONDecoder().decode(SettingsData.self, from: data) else {
            return
        }

        selectedModel = saved.selectedModel
        autoApproveReads = saved.autoApproveReads
        hotkeyKeyCode = saved.hotkeyKeyCode
        hotkeyModifiers = saved.hotkeyModifiers
        maxBudgetUsd = saved.maxBudgetUsd
        notificationSound = saved.notificationSound
        screenSelectionMode = saved.screenSelectionMode
        savedScreenName = saved.savedScreenName
    }

    private func save() {
        let data = SettingsData(
            selectedModel: selectedModel,
            autoApproveReads: autoApproveReads,
            hotkeyKeyCode: hotkeyKeyCode,
            hotkeyModifiers: hotkeyModifiers,
            maxBudgetUsd: maxBudgetUsd,
            notificationSound: notificationSound,
            screenSelectionMode: screenSelectionMode,
            savedScreenName: savedScreenName
        )

        if let encoded = try? JSONEncoder().encode(data) {
            defaults.set(encoded, forKey: key)
        }
    }
}

private struct SettingsData: Codable {
    var selectedModel: String
    var autoApproveReads: Bool
    var hotkeyKeyCode: UInt16
    var hotkeyModifiers: UInt
    var maxBudgetUsd: Double
    var notificationSound: String
    var screenSelectionMode: String
    var savedScreenName: String?
}
```

### Gotchas

1. **`@AppStorage` limitations.** Only supports primitive types (`String`, `Int`, `Double`, `Bool`, `URL`, `Data`). For complex types, use `UserDefaults` with Codable encoding.

2. **`@AppStorage` is not `Sendable`.** It is a SwiftUI property wrapper bound to the view. Do not access it from background threads.

3. **Never store secrets in UserDefaults.** API keys, tokens, passwords go in the Keychain via `Security.framework`. UserDefaults is a plaintext plist file.

4. **Observation.** `@AppStorage` triggers view updates automatically. For the `@Observable` settings class, the `didSet` + `save()` pattern ensures persistence, and `@Observable` handles UI updates.

5. **Migration.** If you change the settings schema, include a version field and migration logic in `load()`.

---

## 14. Multi-Tab UI in SwiftUI

### Recommended Approach

Custom tab strip -- not `TabView`, which gives you the system tab bar. For a Claude Code GUI, you want a Chrome-style tab strip or a sidebar list.

### Architecture

```swift
import SwiftUI

// MARK: - Tab Model

struct TabItem: Identifiable, Equatable {
    let id: String
    var title: String
    var status: TabStatus
    var hasUnread: Bool

    enum TabStatus: Equatable {
        case idle
        case running
        case completed
        case failed
    }
}

// MARK: - Tab Strip View

struct TabStripView: View {
    @Binding var tabs: [TabItem]
    @Binding var activeTabId: String?
    let onClose: (String) -> Void
    let onNew: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 1) {
                    ForEach(tabs) { tab in
                        TabButton(
                            tab: tab,
                            isActive: tab.id == activeTabId,
                            onSelect: { activeTabId = tab.id },
                            onClose: { onClose(tab.id) }
                        )
                    }
                }
                .padding(.horizontal, 4)
            }

            // New tab button
            Button(action: onNew) {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .medium))
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            .foregroundColor(.secondary)
            .padding(.trailing, 8)
        }
        .frame(height: 36)
        .background(Color.black.opacity(0.3))
    }
}

struct TabButton: View {
    let tab: TabItem
    let isActive: Bool
    let onSelect: () -> Void
    let onClose: () -> Void

    @State private var isHovering = false

    var body: some View {
        HStack(spacing: 6) {
            // Status indicator
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)

            // Title
            Text(tab.title)
                .font(.system(size: 11))
                .lineLimit(1)
                .foregroundColor(isActive ? .white : .white.opacity(0.6))

            // Unread indicator
            if tab.hasUnread && !isActive {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 5, height: 5)
            }

            // Close button (visible on hover)
            if isHovering || isActive {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
                .frame(width: 16, height: 16)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isActive ? Color.white.opacity(0.12) : (isHovering ? Color.white.opacity(0.06) : Color.clear))
        )
        .onTapGesture(perform: onSelect)
        .onHover { isHovering = $0 }
    }

    private var statusColor: Color {
        switch tab.status {
        case .idle: return .gray
        case .running: return .green
        case .completed: return .blue
        case .failed: return .red
        }
    }
}

// MARK: - Tab Content Container

struct TabContentContainer: View {
    let store: AppStore
    let tabs: [TabItem]
    let activeTabId: String?

    var body: some View {
        ZStack {
            ForEach(tabs) { tab in
                // Keep all tab views alive but only show the active one
                TabContentView(store: store, tabId: tab.id)
                    .opacity(tab.id == activeTabId ? 1 : 0)
                    .allowsHitTesting(tab.id == activeTabId)
            }
        }
    }
}

struct TabContentView: View {
    let store: AppStore
    let tabId: String

    var body: some View {
        VStack(spacing: 0) {
            // Message list
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        if let session = store.sessions[tabId] {
                            ForEach(session.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                        }
                    }
                    .padding()
                }
            }

            Divider()

            // Input area
            InputBar(store: store, tabId: tabId)
        }
    }
}
```

### State Isolation Per Tab

Each tab maintains independent state through the centralized store:

```swift
// In AppStore:
@MainActor
@Observable
final class AppStore {
    private(set) var tabs: [TabItem] = []
    private(set) var activeTabId: String?
    private(set) var sessions: [String: SessionState] = [:] // keyed by tab ID

    func createTab(title: String = "New Chat") -> String {
        let id = UUID().uuidString
        let tab = TabItem(id: id, title: title, status: .idle, hasUnread: false)
        tabs = tabs + [tab]
        sessions[id] = SessionState(id: id, phase: .idle, messages: [], costUsd: 0)
        activeTabId = id
        return id
    }

    func closeTab(_ id: String) {
        tabs = tabs.filter { $0.id != id }
        sessions.removeValue(forKey: id)

        // If closed tab was active, select an adjacent one
        if activeTabId == id {
            activeTabId = tabs.last?.id
        }
    }
}
```

### Gotchas

1. **Keep inactive tabs alive.** Use `opacity(0)` + `allowsHitTesting(false)` rather than conditional view insertion. This preserves scroll position, text field state, and in-progress operations.

2. **`LazyVStack` for message lists.** For conversations with hundreds of messages, `LazyVStack` only renders visible rows. Combined with `ScrollViewReader`, you can auto-scroll to the bottom on new messages.

3. **Per-tab subprocess.** Each tab may have its own `ClaudeProcess` instance. Track the mapping from tab ID to process in the store or a separate manager.

4. **Tab title from session.** Update the tab title from the first user message or from the Claude session slug. The CLUI-CC reference tracks session metadata for this.

5. **Keyboard shortcuts.** Cmd+T for new tab, Cmd+W for close tab, Cmd+1-9 for tab switching. Register these as key equivalents on the menu items or via `.keyboardShortcut()` in SwiftUI.

6. **Drag reordering.** SwiftUI's `onDrag`/`onDrop` or `.draggable`/`.dropDestination` modifiers enable tab reordering. This is polish but makes a significant UX difference.

---

## Summary: Dependency Map

| Capability | Framework | Third-Party Dependency |
|------------|-----------|----------------------|
| Subprocess management | Foundation.Process | None |
| NDJSON parsing | Foundation.JSONDecoder | None |
| HTTP hook server | Network.NWListener | None (or Hummingbird for proper HTTP) |
| Speech-to-text | AVFoundation + WhisperKit | WhisperKit (SPM) |
| Transparent windows | AppKit.NSPanel | None |
| Notch geometry | AppKit.NSScreen | None |
| Global hotkeys | AppKit.NSEvent / CoreGraphics | None |
| State management | Observation.@Observable | None |
| Markdown rendering | swift-markdown + SwiftUI | apple/swift-markdown (SPM) |
| File attachments | AppKit.NSOpenPanel + CoreGraphics | None |
| Auto-updates | Sparkle | sparkle-project/Sparkle (SPM) |
| Settings | Foundation.UserDefaults | None |
| Multi-tab UI | SwiftUI | None |

Minimum deployment target: **macOS 14** (Sonoma) for `@Observable`, `safeAreaInsets`, and modern SwiftUI features. macOS 15 if using any Swift 6 strict concurrency features.
