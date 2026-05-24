package kz.iitu.backend.chat;

import jakarta.validation.Valid;
import kz.iitu.backend.chat.dto.ContactResponse;
import kz.iitu.backend.chat.dto.ConversationResponse;
import kz.iitu.backend.chat.dto.MessageResponse;
import kz.iitu.backend.chat.dto.SendMessageRequest;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/contacts")
    public ResponseEntity<List<ContactResponse>> getContacts(
            @RequestParam(defaultValue = "") String q,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(chatService.getContacts(me.getId(), me.getRole(), q));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getConversations(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(chatService.getConversations(me.getId()));
    }

    @PostMapping("/conversations/with/{userId}")
    public ResponseEntity<ConversationResponse> getOrCreate(
            @PathVariable UUID userId,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(chatService.getOrCreateConversation(me.getId(), userId));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<MessageResponse>> getMessages(
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(chatService.getMessages(conversationId, me.getId(), page));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(chatService.sendMessage(conversationId, me.getId(), request.getContent()));
    }

    @PostMapping("/conversations/{conversationId}/upload")
    public ResponseEntity<MessageResponse> uploadFile(
            @PathVariable UUID conversationId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(chatService.sendFile(conversationId, me.getId(), file));
    }

    @PostMapping("/conversations/{conversationId}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal CustomUserDetails me) {
        chatService.markRead(conversationId, me.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(Map.of("count", chatService.getTotalUnread(me.getId())));
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal CustomUserDetails me) {
        chatService.deleteConversation(conversationId, me.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal CustomUserDetails me) {
        chatService.deleteMessage(messageId, me.getId());
        return ResponseEntity.noContent().build();
    }
}
