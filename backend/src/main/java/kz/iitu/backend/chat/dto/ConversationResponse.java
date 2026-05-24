package kz.iitu.backend.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class ConversationResponse {
    private UUID id;
    private UUID otherUserId;
    private String otherUserName;
    private String otherUserRole;
    private String otherUserAvatar;
    private LocalDateTime lastMessageAt;
    private long unreadCount;
}
