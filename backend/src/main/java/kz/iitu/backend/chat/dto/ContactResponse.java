package kz.iitu.backend.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data @Builder
public class ContactResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String role;
    private String avatarUrl;
    private String email;
}
