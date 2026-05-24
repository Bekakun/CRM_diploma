package kz.iitu.backend.lesson;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class LessonEntityTest {

    @Test
    void getEndTime_returnsScheduledAtPlusDuration() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 15, 10, 0);
        Lesson lesson = Lesson.builder()
                .title("Test")
                .scheduledAt(start)
                .durationMinutes(90)
                .build();

        LocalDateTime expected = LocalDateTime.of(2025, 1, 15, 11, 30);
        assertThat(lesson.getEndTime()).isEqualTo(expected);
    }

    @Test
    void getEndTime_twohourLesson_correctEnd() {
        LocalDateTime start = LocalDateTime.of(2025, 6, 1, 9, 0);
        Lesson lesson = Lesson.builder()
                .title("Test")
                .scheduledAt(start)
                .durationMinutes(120)
                .build();

        assertThat(lesson.getEndTime()).isEqualTo(LocalDateTime.of(2025, 6, 1, 11, 0));
    }

    @Test
    void defaultStatus_isScheduled() {
        Lesson lesson = Lesson.builder()
                .title("Test")
                .scheduledAt(LocalDateTime.now())
                .build();

        assertThat(lesson.getStatus()).isEqualTo(LessonStatus.SCHEDULED);
    }

    @Test
    void defaultDuration_is120Minutes() {
        Lesson lesson = Lesson.builder()
                .title("Test")
                .scheduledAt(LocalDateTime.now())
                .build();

        assertThat(lesson.getDurationMinutes()).isEqualTo(120);
    }
}
