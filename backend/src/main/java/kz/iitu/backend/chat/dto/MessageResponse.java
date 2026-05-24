package kz.iitu.backend.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class MessageResponse {
    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderAvatar;
    private String content;
    private String fileUrl;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private boolean read;
    private LocalDateTime createdAt;
}
