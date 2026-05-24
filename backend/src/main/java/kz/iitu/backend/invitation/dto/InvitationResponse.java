package kz.iitu.backend.invitation.dto;

import kz.iitu.backend.user.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO для ответа с данными приглашения
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvitationResponse {

    private UUID id;
    private String email;
    private UserRole role;
    private String token;
    private UUID invitedById;
    private String invitedByName;
    private LocalDateTime expiresAt;
    private Boolean isUsed;
    private LocalDateTime createdAt;
}
