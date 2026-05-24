package kz.iitu.backend.telegram;

import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/telegram")
@RequiredArgsConstructor
public class TelegramLinkController {

    private final TelegramLinkService linkService;

    /** Генерировать код привязки (действует 15 минут) */
    @PostMapping("/link-code")
    public ResponseEntity<Map<String, String>> generateCode(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String code = linkService.generateLinkCode(userDetails.getId());
        return ResponseEntity.ok(Map.of("code", code));
    }

    /** Статус привязки */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> status(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        boolean linked = linkService.isLinked(userDetails.getId());
        return ResponseEntity.ok(Map.of("linked", linked));
    }

    /** Отвязать Telegram */
    @DeleteMapping("/unlink")
    public ResponseEntity<Void> unlink(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        linkService.unlinkTelegram(userDetails.getId());
        return ResponseEntity.noContent().build();
    }
}
