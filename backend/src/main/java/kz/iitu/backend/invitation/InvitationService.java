package kz.iitu.backend.invitation;

import kz.iitu.backend.invitation.dto.CreateInvitationRequest;
import kz.iitu.backend.invitation.dto.InvitationResponse;
import kz.iitu.backend.shared.email.EmailService;
import kz.iitu.backend.shared.encryption.EmailHashUtil;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Сервис для работы с приглашениями
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final EmailHashUtil emailHashUtil;

    /**
     * Создать новое приглашение
     */
    @Transactional
    public InvitationResponse createInvitation(CreateInvitationRequest request, UUID invitedById) {
        log.info("Creating invitation for email: {}, role: {}, invitedBy: {}",
                request.getEmail(), request.getRole(), invitedById);

        String emailHash = emailHashUtil.hash(request.getEmail());

        if (userRepository.existsByEmailHash(emailHash)) {
            throw new RuntimeException("Пользователь с таким email уже существует");
        }

        if (invitationRepository.existsByEmailHashAndIsUsedFalse(emailHash)) {
            throw new RuntimeException("Активное приглашение для этого email уже существует");
        }

        User inviter = userRepository.findById(invitedById)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);

        Invitation invitation = Invitation.builder()
                .email(request.getEmail())
                .emailHash(emailHash)
                .role(request.getRole())
                .token(token)
                .invitedBy(inviter)
                .expiresAt(expiresAt)
                .isUsed(false)
                .build();

        invitation = invitationRepository.save(invitation);
        log.info("Invitation created with id: {}, token: {}", invitation.getId(), invitation.getToken());

        // Отправить email с приглашением
        emailService.sendInvitationEmail(
                invitation.getEmail(),
                invitation.getRole().name(),
                invitation.getToken(),
                inviter.getFirstName() + " " + inviter.getLastName()
        );
        log.info("Invitation email sent to: {}", invitation.getEmail());

        return mapToResponse(invitation);
    }

    /**
     * Получить список всех приглашений
     */
    @Transactional(readOnly = true)
    public List<InvitationResponse> getAllInvitations() {
        log.info("Fetching all invitations");
        return invitationRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Удалить приглашение по ID
     */
    @Transactional
    public void deleteInvitation(UUID invitationId) {
        log.info("Deleting invitation with id: {}", invitationId);

        if (!invitationRepository.existsById(invitationId)) {
            throw new RuntimeException("Приглашение с id " + invitationId + " не найдено");
        }

        invitationRepository.deleteById(invitationId);
        log.info("Invitation deleted successfully: {}", invitationId);
    }

    /**
     * Найти приглашение по токену (для использования при регистрации)
     */
    @Transactional(readOnly = true)
    public Invitation findByToken(String token) {
        return invitationRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Приглашение не найдено"));
    }

    /**
     * Отметить приглашение как использованное
     */
    @Transactional
    public void markAsUsed(String token) {
        Invitation invitation = findByToken(token);

        if (invitation.getIsUsed()) {
            throw new RuntimeException("Приглашение уже использовано");
        }

        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            throw new RuntimeException("Срок действия приглашения истек");
        }

        invitation.setIsUsed(true);
        invitationRepository.save(invitation);
        log.info("Invitation marked as used: {}", token);
    }

    /**
     * Маппинг Invitation entity в DTO
     */
    private InvitationResponse mapToResponse(Invitation invitation) {
        return InvitationResponse.builder()
                .id(invitation.getId())
                .email(invitation.getEmail())
                .role(invitation.getRole())
                .token(invitation.getToken())
                .invitedById(invitation.getInvitedBy().getId())
                .invitedByName(invitation.getInvitedBy().getFirstName() + " " +
                              invitation.getInvitedBy().getLastName())
                .expiresAt(invitation.getExpiresAt())
                .isUsed(invitation.getIsUsed())
                .createdAt(invitation.getCreatedAt())
                .build();
    }
}
