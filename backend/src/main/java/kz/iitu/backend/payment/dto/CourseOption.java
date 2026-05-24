package kz.iitu.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class CourseOption {
    private UUID id;
    private String name;
}
