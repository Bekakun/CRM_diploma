package kz.iitu.backend.ai.dto;

import kz.iitu.backend.ai.AiChatSession;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class AiSessionDTO {
    private UUID id;
    private String title;
    private UUID enrollmentId;
    private UUID courseId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<AiMessageDTO> messages;

    public static AiSessionDTO from(AiChatSession s, boolean includeMessages) {
        AiSessionDTO dto = new AiSessionDTO();
        dto.id = s.getId();
        dto.title = s.getTitle();
        dto.enrollmentId = s.getEnrollmentId();
        dto.courseId = s.getCourseId();
        dto.createdAt = s.getCreatedAt();
        dto.updatedAt = s.getUpdatedAt();
        if (includeMessages) {
            dto.messages = s.getMessages().stream().map(AiMessageDTO::from).toList();
        }
        return dto;
    }
}
