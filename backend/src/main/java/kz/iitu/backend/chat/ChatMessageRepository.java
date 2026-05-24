package kz.iitu.backend.chat;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("SELECT m FROM ChatMessage m WHERE m.conversation.id = :convId ORDER BY m.createdAt ASC")
    Page<ChatMessage> findByConversationId(@Param("convId") UUID convId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.conversation.id = :convId AND m.sender.id <> :userId AND m.read = false")
    long countUnread(@Param("convId") UUID convId, @Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.read = true WHERE m.conversation.id = :convId AND m.sender.id <> :userId AND m.read = false")
    void markAllRead(@Param("convId") UUID convId, @Param("userId") UUID userId);

    @Query("""
        SELECT COUNT(m) FROM ChatMessage m
        WHERE m.conversation.id IN (
            SELECT c.id FROM ChatConversation c
            WHERE c.participantOne.id = :userId OR c.participantTwo.id = :userId
        )
        AND m.sender.id <> :userId AND m.read = false
    """)
    long countTotalUnread(@Param("userId") UUID userId);
}
