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
@RequestMapping("/api/v1/student/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final GeminiService geminiService;
    private final AiHistoryService historyService;

    /** GET /api/v1/student/ai/sessions — список всех сессий */
    @GetMapping("/sessions")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<AiSessionDTO>> getSessions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(historyService.getSessions(userDetails.getId()));
    }

    /** GET /api/v1/student/ai/sessions/{id} — сессия с сообщениями */
    @GetMapping("/sessions/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AiSessionDTO> getSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(historyService.getSession(id, userDetails.getId()));
    }

    /** POST /api/v1/student/ai/sessions — создать новую сессию */
    @PostMapping("/sessions")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AiSessionDTO> createSession(
            @RequestParam UUID enrollmentId,
            @RequestParam(required = false) UUID courseId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        AiChatSession session = historyService.createSession(
                userDetails.getId(), enrollmentId, courseId, "Новый чат");
        return ResponseEntity.status(HttpStatus.CREATED).body(AiSessionDTO.from(session, false));
    }

    /** DELETE /api/v1/student/ai/sessions/{id} — удалить сессию */
    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> deleteSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        historyService.deleteSession(id, userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/v1/student/ai/messages/{id} — удалить одно сообщение */
    @DeleteMapping("/messages/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        historyService.deleteMessage(id, userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    /** POST /api/v1/student/ai/chat?enrollmentId={id}&sessionId={id} — отправить сообщение */
    @PostMapping("/chat")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> chat(
            @RequestParam UUID enrollmentId,
            @RequestParam(required = false) UUID sessionId,
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/student/ai/chat - enrollmentId={} sessionId={} user={}",
                enrollmentId, sessionId, userDetails.getId());

        // Получить или создать сессию
        AiChatSession session;
        if (sessionId != null) {
            session = historyService.getOrLoadSession(sessionId, userDetails.getId());
        } else {
            session = historyService.createSession(userDetails.getId(), enrollmentId, null, "Новый чат");
        }

        // Сохранить сообщение пользователя
        historyService.addMessage(session, "user", request.getMessage());

        // Получить ответ AI
        String reply = geminiService.chat(userDetails.getId(), enrollmentId, request.getMessage());

        // Сохранить ответ AI
        AiChatMessage aiMsg = historyService.addMessage(session, "ai", reply);

        return ResponseEntity.ok(Map.of(
                "reply", reply,
                "sessionId", session.getId(),
                "messageId", aiMsg.getId()
        ));
    }
}
