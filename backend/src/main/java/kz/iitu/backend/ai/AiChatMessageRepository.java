package kz.iitu.backend.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, UUID> {

    @Query("SELECT m FROM AiChatMessage m WHERE m.id = :id AND m.session.user.id = :userId")
    Optional<AiChatMessage> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}
