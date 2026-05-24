package kz.iitu.backend.invitation;

import jakarta.validation.Valid;
import kz.iitu.backend.invitation.dto.CreateInvitationRequest;
import kz.iitu.backend.invitation.dto.InvitationResponse;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Контроллер для управления приглашениями
 * Доступно только для администраторов
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class InvitationController {

    private final InvitationService invitationService;

    /**
     * Публичный endpoint для получения email по токену приглашения
     * GET /api/v1/invitations/by-token/{token}
     */
    @GetMapping("/api/v1/invitations/by-token/{token}")
    public ResponseEntity<java.util.Map<String, String>> getInvitationByToken(@PathVariable String token) {
        log.info("GET /api/v1/invitations/by-token/{} - Public lookup", token);
        Invitation invitation = invitationService.findByToken(token);
        if (invitation.getIsUsed()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Приглашение уже использовано"));
        }
        if (java.time.LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Срок действия приглашения истек"));
        }
        return ResponseEntity.ok(java.util.Map.of("email", invitation.getEmail()));
    }

    /**
     * Создать новое приглашение
     * POST /api/v1/admin/invitations
     */
    @PostMapping("/api/v1/admin/invitations")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<InvitationResponse> createInvitation(
            @Valid @RequestBody CreateInvitationRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        log.info("POST /api/v1/admin/invitations - Creating invitation for: {} by user: {}",
                request.getEmail(), currentUser.getEmail());

        // Получить ID текущего аутентифицированного пользователя
        UUID currentUserId = currentUser.getId();

        InvitationResponse response = invitationService.createInvitation(request, currentUserId);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Получить список всех приглашений
     * GET /api/v1/admin/invitations
     */
    @GetMapping("/api/v1/admin/invitations")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<InvitationResponse>> getAllInvitations() {
        log.info("GET /api/v1/admin/invitations - Fetching all invitations");

        List<InvitationResponse> invitations = invitationService.getAllInvitations();

        return ResponseEntity.ok(invitations);
    }

    /**
     * Удалить приглашение
     * DELETE /api/v1/admin/invitations/:id
     */
    @DeleteMapping("/api/v1/admin/invitations/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteInvitation(@PathVariable UUID id) {
        log.info("DELETE /api/v1/admin/invitations/{} - Deleting invitation", id);

        invitationService.deleteInvitation(id);

        return ResponseEntity.noContent().build();
    }
}
