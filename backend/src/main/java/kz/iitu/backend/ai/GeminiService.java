package kz.iitu.backend.ai;

import kz.iitu.backend.course.Course;
import kz.iitu.backend.course.CourseRepository;
import kz.iitu.backend.student.StudentService;
import kz.iitu.backend.student.dto.StudentPerformanceResponse;
import kz.iitu.backend.student.dto.StudentResponse;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.shared.exception.ForbiddenException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    private final RestTemplate restTemplate;
    private final StudentService studentService;
    private final CourseRepository courseRepository;

    @Value("${openrouter.api.key}")
    private String apiKey;

    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
    private static final String MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

    public String chat(UUID studentUserId, UUID enrollmentId, String userMessage) {
        StudentPerformanceResponse perf = studentService.getStudentDetails(enrollmentId, studentUserId);

        Map<String, Object> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", buildSystemPrompt(perf) + "\n\nВопрос студента: " + userMessage);

        Map<String, Object> body = new HashMap<>();
        body.put("model", MODEL);
        body.put("messages", List.of(userMsg));
        body.put("reasoning", Map.of("enabled", true));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(OPENROUTER_URL, entity, Map.class);
            String reply = extractReply(response.getBody());
            if (reply == null || reply.isBlank()) {
                throw new RuntimeException("AI вернул пустой ответ");
            }
            return reply;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("OpenRouter API HTTP {} error: {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 429) {
                throw new RuntimeException("AI-сервис временно перегружен. Попробуйте через несколько секунд.");
            }
            if (e.getStatusCode().value() == 404) {
                throw new RuntimeException("AI-модель недоступна. Обратитесь к администратору.");
            }
            throw new RuntimeException("Ошибка AI-сервиса: " + e.getStatusCode());
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            log.error("OpenRouter server error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("AI-сервис временно недоступен. Попробуйте позже.");
        } catch (Exception e) {
            log.error("OpenRouter API error: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось получить ответ от AI ассистента");
        }
    }

    private String buildSystemPrompt(StudentPerformanceResponse perf) {
        StringBuilder sb = new StringBuilder();
        sb.append("Ты — AI-репетитор студента. Отвечай на русском языке.\n");
        sb.append("ВАЖНО: Никогда не используй таблицы (markdown tables). Вместо таблиц используй маркированные списки или текст с цифрами.\n\n");
        sb.append("Имя студента: ").append(perf.getFirstName()).append(" ").append(perf.getLastName()).append("\n");
        sb.append("Курс: ").append(perf.getCourseName()).append("\n");

        if (perf.getAverageGrade() != null) {
            sb.append("Средний балл: ").append(Math.round(perf.getAverageGrade())).append("/100\n");
        }
        if (perf.getAttendanceRate() != null) {
            sb.append("Посещаемость: ").append(Math.round(perf.getAttendanceRate())).append("%\n");
        }
        if (perf.getHomeworkCompletionRate() != null) {
            sb.append("Выполнено ДЗ: ").append(Math.round(perf.getHomeworkCompletionRate())).append("%\n");
        }

        if (perf.getPerformance() != null && !perf.getPerformance().isEmpty()) {
            sb.append("\nОценки по урокам:\n");
            for (var lesson : perf.getPerformance()) {
                sb.append("- ").append(lesson.getLessonTitle());
                boolean attended = lesson.getAttendance() != null &&
                        ("PRESENT".equals(lesson.getAttendance().getStatus()) ||
                         "LATE".equals(lesson.getAttendance().getStatus()));
                sb.append(attended ? " [посетил]" : " [пропустил]");
                if (lesson.getHomework() != null && lesson.getHomework().getSubmission() != null) {
                    var sub = lesson.getHomework().getSubmission();
                    if (sub.getGrade() != null) {
                        sb.append(", оценка: ").append(sub.getGrade()).append("/100");
                        if (Boolean.TRUE.equals(sub.getIsLate())) sb.append(" (просрочено)");
                    } else {
                        sb.append(", ДЗ сдано без оценки");
                    }
                } else if (lesson.getHomework() != null) {
                    sb.append(", ДЗ не сдано");
                }
                sb.append("\n");
            }
        }

        sb.append("\nЕсли студент спрашивает об оценках или успеваемости — используй данные выше. ");
        sb.append("Если у студента есть слабые темы (оценка ниже 70) — предложи помощь по ним.");

        return sb.toString();
    }

    public String chatInstructor(UUID instructorId, UUID courseId, String userMessage) {
        Course course = courseRepository.findByIdWithInstructor(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (!course.getInstructor().getId().equals(instructorId)) {
            throw new ForbiddenException("You do not have access to this course");
        }

        List<StudentResponse> students = studentService.getStudentsByCourse(courseId);

        Map<String, Object> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", buildInstructorPrompt(course, students, instructorId) + "\n\nВопрос преподавателя: " + userMessage);

        Map<String, Object> body = new HashMap<>();
        body.put("model", MODEL);
        body.put("messages", List.of(userMsg));
        body.put("reasoning", Map.of("enabled", true));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(OPENROUTER_URL, entity, Map.class);
            String reply = extractReply(response.getBody());
            if (reply == null || reply.isBlank()) {
                throw new RuntimeException("AI вернул пустой ответ");
            }
            return reply;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("OpenRouter API HTTP {} error (instructor): {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 429) {
                throw new RuntimeException("AI-сервис временно перегружен. Попробуйте через несколько секунд.");
            }
            throw new RuntimeException("Ошибка AI-сервиса: " + e.getStatusCode());
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            log.error("OpenRouter server error {} (instructor): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("AI-сервис временно недоступен. Попробуйте позже.");
        } catch (Exception e) {
            log.error("OpenRouter API error (instructor): {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось получить ответ от AI ассистента");
        }
    }

    private String buildInstructorPrompt(Course course, List<StudentResponse> students, UUID instructorId) {
        StringBuilder sb = new StringBuilder();
        sb.append("Ты — AI-помощник преподавателя. Отвечай на русском языке.\n");
        sb.append("ВАЖНО: Никогда не используй таблицы (markdown tables). Вместо таблиц используй маркированные списки или текст с цифрами.\n\n");
        sb.append("Курс: ").append(course.getName()).append("\n");
        sb.append("Количество студентов: ").append(students.size()).append("\n\n");

        if (!students.isEmpty()) {
            sb.append("Данные по студентам:\n");
            for (StudentResponse s : students) {
                sb.append("- ").append(s.getFirstName()).append(" ").append(s.getLastName());
                if (s.getAverageGrade() != null) {
                    sb.append(", средний балл: ").append(Math.round(s.getAverageGrade())).append("/100");
                } else {
                    sb.append(", оценок нет");
                }
                if (s.getAttendanceRate() != null) {
                    sb.append(", посещаемость: ").append(Math.round(s.getAttendanceRate())).append("%");
                }
                if (s.getHomeworkCompletionRate() != null) {
                    sb.append(", выполнено ДЗ: ").append(Math.round(s.getHomeworkCompletionRate())).append("%");
                }
                sb.append("\n");
            }
            sb.append("\n");

            // Compute summary stats
            double avgGrade = students.stream()
                    .filter(s -> s.getAverageGrade() != null)
                    .mapToDouble(StudentResponse::getAverageGrade)
                    .average().orElse(0);
            double avgAttendance = students.stream()
                    .filter(s -> s.getAttendanceRate() != null)
                    .mapToDouble(StudentResponse::getAttendanceRate)
                    .average().orElse(0);
            long atRisk = students.stream()
                    .filter(s -> s.getAverageGrade() != null && s.getAverageGrade() < 60)
                    .count();

            sb.append("Средний балл по курсу: ").append(Math.round(avgGrade)).append("/100\n");
            sb.append("Средняя посещаемость: ").append(Math.round(avgAttendance)).append("%\n");
            if (atRisk > 0) {
                sb.append("Студентов в зоне риска (балл < 60): ").append(atRisk).append("\n");
            }
        }

        sb.append("\nПомогай преподавателю анализировать успеваемость, выявлять проблемы и давать советы по работе со студентами.");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String extractReply(Map<?, ?> responseBody) {
        try {
            var choices = (List<Map<?, ?>>) responseBody.get("choices");
            var message = (Map<?, ?>) choices.get(0).get("message");
            return (String) message.get("content");
        } catch (Exception e) {
            log.error("Failed to parse OpenRouter response: {}", responseBody);
            throw new RuntimeException("Не удалось разобрать ответ от AI");
        }
    }
}
