package kz.iitu.backend.submission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitHomeworkRequest {

    @NotBlank(message = "GitHub URL is required")
    @Pattern(
        regexp = "^https://github\\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+.*$",
        message = "Invalid GitHub URL format. Must start with https://github.com/"
    )
    private String githubUrl;
}
