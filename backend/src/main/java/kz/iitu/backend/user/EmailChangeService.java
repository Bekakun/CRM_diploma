package kz.iitu.backend.user;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory storage for pending email change requests.
 * Each entry holds the new email and a 6-digit verification code valid for 10 minutes.
 */
@Service
public class EmailChangeService {

    @Data
    public static class PendingChange {
        private final String newEmail;
        private final String code;
        private final Instant expiresAt;
    }

    private final Map<String, PendingChange> pending = new ConcurrentHashMap<>();

    public PendingChange createRequest(String userId, String newEmail) {
        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        PendingChange change = new PendingChange(newEmail, code, Instant.now().plusSeconds(600));
        pending.put(userId, change);
        return change;
    }

    public Optional<PendingChange> getRequest(String userId) {
        PendingChange change = pending.get(userId);
        if (change == null) return Optional.empty();
        if (change.getExpiresAt().isBefore(Instant.now())) {
            pending.remove(userId);
            return Optional.empty();
        }
        return Optional.of(change);
    }

    public void remove(String userId) {
        pending.remove(userId);
    }
}
