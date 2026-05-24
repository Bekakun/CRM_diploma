package kz.iitu.backend.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {

    @Query("""
        SELECT c FROM ChatConversation c
        WHERE (c.participantOne.id = :userId OR c.participantTwo.id = :userId)
        ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC
    """)
    List<ChatConversation> findAllByUserId(@Param("userId") UUID userId);

    @Query("""
        SELECT c FROM ChatConversation c
        WHERE (c.participantOne.id = :a AND c.participantTwo.id = :b)
           OR (c.participantOne.id = :b AND c.participantTwo.id = :a)
    """)
    Optional<ChatConversation> findByParticipants(@Param("a") UUID a, @Param("b") UUID b);
}
