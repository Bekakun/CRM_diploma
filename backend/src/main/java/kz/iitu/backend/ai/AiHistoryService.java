package kz.iitu.backend.ai;

import kz.iitu.backend.ai.dto.AiSessionDTO;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.shared.exception.ForbiddenException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiHistoryService {

    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AiSessionDTO> getSessions(UUID userId) {
        return sessionRepository.findAllByUserId(userId)
                .stream()
                .map(s -> AiSessionDTO.from(s, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public AiSessionDTO getSession(UUID sessionId, UUID userId) {
        AiChatSession session = sessionRepository.findByIdWithMessages(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!session.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access denied");
        }
        return AiSessionDTO.from(session, true);
    }

    @Transactional
    public AiChatSession createSession(UUID userId, UUID enrollmentId, UUID courseId, String title) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        AiChatSession session = AiChatSession.builder()
                .user(user)
                .enrollmentId(enrollmentId)
                .courseId(courseId)
                .title(title)
                .build();
        return sessionRepository.save(session);
    }

    @Transactional
    public AiChatMessage addMessage(AiChatSession session, String role, String content) {
        AiChatMessage msg = AiChatMessage.builder()
                .session(session)
                .role(role)
                .content(content)
                .build();
        AiChatMessage saved = messageRepository.save(msg);
        session.getMessages().add(saved);
        // Update title from first user message
        if ("user".equals(role) && session.getMessages().stream().filter(m -> "user".equals(m.getRole())).count() == 1) {
            String title = content.length() > 60 ? content.substring(0, 57) + "..." : content;
            session.setTitle(title);
            sessionRepository.save(session);
        }
        return saved;
    }

    @Transactional
    public void deleteSession(UUID sessionId, UUID userId) {
        AiChatSession session = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        sessionRepository.delete(session);
    }

    @Transactional
    public void deleteMessage(UUID messageId, UUID userId) {
        AiChatMessage msg = messageRepository.findByIdAndUserId(messageId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        AiChatSession session = msg.getSession();
        session.getMessages().remove(msg);
        messageRepository.delete(msg);
    }

    @Transactional
    public AiChatSession getOrLoadSession(UUID sessionId, UUID userId) {
        AiChatSession session = sessionRepository.findByIdWithMessages(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!session.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access denied");
        }
        return session;
    }
}
