package kz.iitu.backend.ai.dto;

import kz.iitu.backend.ai.AiChatMessage;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AiMessageDTO {
    private UUID id;
    private String role;
    private String content;
    private LocalDateTime createdAt;

    public static AiMessageDTO from(AiChatMessage m) {
        AiMessageDTO dto = new AiMessageDTO();
        dto.id = m.getId();
        dto.role = m.getRole();
        dto.content = m.getContent();
        dto.createdAt = m.getCreatedAt();
        return dto;
    }
}
