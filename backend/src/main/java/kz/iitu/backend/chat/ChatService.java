package kz.iitu.backend.chat;

import kz.iitu.backend.chat.dto.*;
import kz.iitu.backend.chat.dto.ContactResponse;
import kz.iitu.backend.chat.dto.ConversationResponse;
import kz.iitu.backend.chat.dto.MessageResponse;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.shared.storage.FileStorageService;
import kz.iitu.backend.student.StudentRepository;
import kz.iitu.backend.telegram.TelegramBotService;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.shared.exception.ForbiddenException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatConversationRepository conversationRepo;
    private final ChatMessageRepository messageRepo;
    private final UserRepository userRepo;
    private final StudentRepository studentRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final FileStorageService fileStorageService;
    private final TelegramBotService telegramBotService;

    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversations(UUID userId) {
        return conversationRepo.findAllByUserId(userId).stream()
                .map(c -> toConversationResponse(c, userId))
                .toList();
    }

    @Transactional
    public ConversationResponse getOrCreateConversation(UUID currentUserId, UUID otherUserId) {
        return conversationRepo.findByParticipants(currentUserId, otherUserId)
                .map(c -> toConversationResponse(c, currentUserId))
                .orElseGet(() -> {
                    User me = userRepo.findById(currentUserId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                    User other = userRepo.findById(otherUserId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                    ChatConversation conv = conversationRepo.save(
                            ChatConversation.builder()
                                    .participantOne(me)
                                    .participantTwo(other)
                                    .build()
                    );
                    return toConversationResponse(conv, currentUserId);
                });
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(UUID conversationId, UUID userId, int page) {
        ensureParticipant(conversationId, userId);
        return messageRepo.findByConversationId(
                conversationId,
                PageRequest.of(page, 50)
        ).getContent().stream().map(this::toMessageResponse).toList();
    }

    @Transactional
    public MessageResponse sendMessage(UUID conversationId, UUID senderId, String content) {
        ensureParticipant(conversationId, senderId);

        ChatConversation conv = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        User sender = userRepo.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatMessage msg = messageRepo.save(ChatMessage.builder()
                .conversation(conv)
                .sender(sender)
                .content(content.trim())
                .build());

        conv.setLastMessageAt(LocalDateTime.now());
        conversationRepo.save(conv);

        MessageResponse response = toMessageResponse(msg);

        // Push через WebSocket собеседнику
        User recipient = conv.getParticipantOne().getId().equals(senderId)
                ? conv.getParticipantTwo()
                : conv.getParticipantOne();
        messagingTemplate.convertAndSendToUser(
                recipient.getId().toString(),
                "/queue/messages",
                response
        );

        // Telegram-уведомление если собеседник привязал бота
        sendTelegramChatNotification(recipient, sender, content, false);

        return response;
    }

    @Transactional
    public void markRead(UUID conversationId, UUID userId) {
        ensureParticipant(conversationId, userId);
        messageRepo.markAllRead(conversationId, userId);
    }

    @Transactional(readOnly = true)
    public long getTotalUnread(UUID userId) {
        return messageRepo.countTotalUnread(userId);
    }

    @Transactional
    public void deleteConversation(UUID conversationId, UUID userId) {
        ensureParticipant(conversationId, userId);
        conversationRepo.deleteById(conversationId);
    }

    @Transactional
    public void deleteMessage(UUID messageId, UUID userId) {
        ChatMessage msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        ensureParticipant(msg.getConversation().getId(), userId);
        if (!msg.getSender().getId().equals(userId)) {
            throw new ForbiddenException("You can only delete your own messages");
        }
        messageRepo.delete(msg);
    }

    @Transactional
    public MessageResponse sendFile(UUID conversationId, UUID senderId, MultipartFile file) {
        ensureParticipant(conversationId, senderId);

        ChatConversation conv = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        User sender = userRepo.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String fileUrl = fileStorageService.uploadChatFile(file);

        ChatMessage msg = messageRepo.save(ChatMessage.builder()
                .conversation(conv)
                .sender(sender)
                .fileUrl(fileUrl)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .build());

        conv.setLastMessageAt(java.time.LocalDateTime.now());
        conversationRepo.save(conv);

        MessageResponse response = toMessageResponse(msg);

        User recipient = conv.getParticipantOne().getId().equals(senderId)
                ? conv.getParticipantTwo()
                : conv.getParticipantOne();
        messagingTemplate.convertAndSendToUser(recipient.getId().toString(), "/queue/messages", response);

        // Telegram-уведомление для файлового сообщения
        sendTelegramChatNotification(recipient, sender, file.getOriginalFilename(), true);

        return response;
    }

    /**
     * Returns contacts the current user is allowed to message.
     * - INSTRUCTOR: own students + admins
     * - STUDENT: coursemates + their instructor + admins
     * - ADMIN/SUPER_ADMIN: everyone
     */
    @Transactional(readOnly = true)
    public List<ContactResponse> getContacts(UUID userId, UserRole role, String query) {
        String q = query == null ? "" : query.trim();
        List<UserRole> allowedRoles;

        switch (role) {
            case INSTRUCTOR -> allowedRoles = List.of(UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN);
            case STUDENT -> allowedRoles = List.of(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN);
            default -> allowedRoles = List.of(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN);
        }

        // Имена зашифрованы, поэтому фильтрация по query делается в Java после расшифровки
        return userRepo.searchContacts(userId, allowedRoles).stream()
                .filter(u -> q.isEmpty()
                        || (u.getFirstName() != null && u.getFirstName().toLowerCase().contains(q.toLowerCase()))
                        || (u.getLastName() != null && u.getLastName().toLowerCase().contains(q.toLowerCase())))
                .map(u -> ContactResponse.builder()
                        .id(u.getId())
                        .firstName(u.getFirstName())
                        .lastName(u.getLastName())
                        .role(u.getRole().name())
                        .avatarUrl(u.getProfilePhotoUrl())
                        .email(u.getEmail())
                        .build())
                .toList();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void ensureParticipant(UUID conversationId, UUID userId) {
        ChatConversation conv = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        boolean isParticipant = conv.getParticipantOne().getId().equals(userId)
                || conv.getParticipantTwo().getId().equals(userId);
        if (!isParticipant) throw new SecurityException("Access denied");
    }

    private ConversationResponse toConversationResponse(ChatConversation c, UUID myId) {
        User other = c.getParticipantOne().getId().equals(myId)
                ? c.getParticipantTwo()
                : c.getParticipantOne();
        long unread = messageRepo.countUnread(c.getId(), myId);
        return ConversationResponse.builder()
                .id(c.getId())
                .otherUserId(other.getId())
                .otherUserName(other.getFirstName() + " " + other.getLastName())
                .otherUserRole(other.getRole().name())
                .otherUserAvatar(other.getProfilePhotoUrl())
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unread)
                .build();
    }

    private MessageResponse toMessageResponse(ChatMessage m) {
        return MessageResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                .senderAvatar(m.getSender().getProfilePhotoUrl())
                .content(m.getContent())
                .fileUrl(m.getFileUrl())
                .fileName(m.getFileName())
                .fileType(m.getFileType())
                .fileSize(m.getFileSize())
                .read(m.isRead())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private void sendTelegramChatNotification(User recipient, User sender, String preview, boolean isFile) {
        if (recipient.getTelegramChatId() == null) return;
        String senderName = sender.getFirstName() + " " + sender.getLastName();
        String body = isFile
                ? "📎 " + (preview != null ? preview : "файл")
                : (preview != null && preview.length() > 200 ? preview.substring(0, 200) + "…" : preview);
        String text = "💬 <b>Новое сообщение от " + escapeHtml(senderName) + "</b>\n" + escapeHtml(body);
        telegramBotService.sendMessage(recipient.getTelegramChatId(), text);
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
