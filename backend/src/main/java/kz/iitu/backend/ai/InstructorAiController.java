package kz.iitu.backend.ai;

import jakarta.validation.Valid;
import kz.iitu.backend.ai.dto.AiSessionDTO;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/instructor/ai")
@RequiredArgsConstructor
public class InstructorAiController {

    private final GeminiService geminiService;
    private final AiHistoryService historyService;

    /** GET /api/v1/instructor/ai/sessions */
    @GetMapping("/sessions")
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<List<AiSessionDTO>> getSessions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(historyService.getSessions(userDetails.getId()));
    }

    /** GET /api/v1/instructor/ai/sessions/{id} */
    @GetMapping("/sessions/{id}")
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<AiSessionDTO> getSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(historyService.getSession(id, userDetails.getId()));
    }

    /** POST /api/v1/instructor/ai/sessions */
    @PostMapping("/sessions")
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<AiSessionDTO> createSession(
            @RequestParam UUID courseId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        AiChatSession session = historyService.createSession(
                userDetails.getId(), null, courseId, "Новый чат");
        return ResponseEntity.status(HttpStatus.CREATED).body(AiSessionDTO.from(session, false));
    }

    /** DELETE /api/v1/instructor/ai/sessions/{id} */
    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<Void> deleteSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        historyService.deleteSession(id, userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/v1/instructor/ai/messages/{id} */
    @DeleteMapping("/messages/{id}")
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        historyService.deleteMessage(id, userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    /** POST /api/v1/instructor/ai/chat?courseId={id}&sessionId={id} */
    @PostMapping("/chat")
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<Map<String, Object>> chat(
            @RequestParam UUID courseId,
            @RequestParam(required = false) UUID sessionId,
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/instructor/ai/chat - courseId={} sessionId={} instructor={}",
                courseId, sessionId, userDetails.getId());

        AiChatSession session;
        if (sessionId != null) {
            session = historyService.getOrLoadSession(sessionId, userDetails.getId());
        } else {
            session = historyService.createSession(userDetails.getId(), null, courseId, "Новый чат");
        }

        historyService.addMessage(session, "user", request.getMessage());

        String reply = geminiService.chatInstructor(userDetails.getId(), courseId, request.getMessage());

        AiChatMessage aiMsg = historyService.addMessage(session, "ai", reply);

        return ResponseEntity.ok(Map.of(
                "reply", reply,
                "sessionId", session.getId(),
                "messageId", aiMsg.getId()
        ));
    }
}
