package kz.iitu.backend.homework.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateHomeworkRequest {

    private String title;
    private String description;
    private LocalDateTime deadline;
}
