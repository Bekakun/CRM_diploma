package kz.iitu.backend.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, UUID> {

    @Query("SELECT s FROM AiChatSession s WHERE s.user.id = :userId ORDER BY s.updatedAt DESC")
    List<AiChatSession> findAllByUserId(@Param("userId") UUID userId);

    @Query("SELECT s FROM AiChatSession s LEFT JOIN FETCH s.messages WHERE s.id = :id")
    Optional<AiChatSession> findByIdWithMessages(@Param("id") UUID id);

    Optional<AiChatSession> findByIdAndUserId(UUID id, UUID userId);
}
