package kz.iitu.backend.course;

import kz.iitu.backend.attendance.Attendance;
import kz.iitu.backend.attendance.AttendanceRepository;
import kz.iitu.backend.attendance.AttendanceStatus;
import kz.iitu.backend.course.dto.CourseAnalyticsResponse;
import kz.iitu.backend.homework.Homework;
import kz.iitu.backend.homework.HomeworkRepository;
import kz.iitu.backend.lesson.Lesson;
import kz.iitu.backend.lesson.LessonRepository;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.student.StudentRepository;
import kz.iitu.backend.submission.HomeworkSubmission;
import kz.iitu.backend.submission.HomeworkSubmissionRepository;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CourseAnalyticsService {

    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final LessonRepository lessonRepository;
    private final HomeworkRepository homeworkRepository;
    private final HomeworkSubmissionRepository submissionRepository;
    private final AttendanceRepository attendanceRepository;

    @Transactional(readOnly = true)
    public CourseAnalyticsResponse getCourseAnalytics(UUID courseId, UUID requestingUserId, UserRole requestingUserRole) {
        log.info("Fetching analytics for course {} by user {}", courseId, requestingUserId);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        // Только инструктор курса, или admin/super_admin
        boolean isAdmin = requestingUserRole == UserRole.ADMIN || requestingUserRole == UserRole.SUPER_ADMIN;
        if (!isAdmin && !course.getInstructor().getId().equals(requestingUserId)) {
            throw new ForbiddenException("You do not have access to this course analytics");
        }

        long totalStudents = studentRepository.countByCourseId(courseId);

        // Уроки курса (в хронологическом порядке)
        List<Lesson> lessons = lessonRepository.findByCourseId(
                courseId,
                PageRequest.of(0, 1000, Sort.by(Sort.Direction.ASC, "scheduledAt"))
        ).getContent();

        // Homework по курсу
        List<Homework> homeworks = homeworkRepository.findAllByCourseId(courseId);
        Set<UUID> hwIds = homeworks.stream().map(Homework::getId).collect(Collectors.toSet());

        // Сабмиты по курсу
        List<HomeworkSubmission> submissions = submissionRepository.findAllByCourseId(courseId);

        // Посещаемость по курсу
        List<Attendance> attendances = attendanceRepository.findAllByCourseId(courseId);

        // ── Средний балл ─────────────────────────────────────────────────────
        OptionalDouble avgGradeOpt = submissions.stream()
                .filter(s -> s.getGrade() != null)
                .mapToInt(HomeworkSubmission::getGrade)
                .average();
        Double avgGrade = avgGradeOpt.isPresent() ? Math.round(avgGradeOpt.getAsDouble() * 10.0) / 10.0 : null;

        // ── Submission rate: (уникальных студентов, сдавших хоть одно ДЗ) / totalStudents * 100 ──
        // Более точно: (кол-во сабмитов) / (кол-во ДЗ * кол-во студентов) * 100
        double submissionRate = 0.0;
        if (!hwIds.isEmpty() && totalStudents > 0) {
            long maxPossibleSubmissions = hwIds.size() * totalStudents;
            submissionRate = Math.round((submissions.size() * 100.0 / maxPossibleSubmissions) * 10.0) / 10.0;
        }

        // ── Attendance rate: (PRESENT + LATE) / (lessons * students) * 100 ──
        double attendanceRate = 0.0;
        if (!lessons.isEmpty() && totalStudents > 0) {
            long presentCount = attendances.stream()
                    .filter(a -> a.getStatus() == AttendanceStatus.PRESENT || a.getStatus() == AttendanceStatus.LATE)
                    .count();
            long maxPossibleAttendances = lessons.size() * totalStudents;
            attendanceRate = Math.round((presentCount * 100.0 / maxPossibleAttendances) * 10.0) / 10.0;
        }

        // ── Grade distribution ────────────────────────────────────────────────
        List<Integer> grades = submissions.stream()
                .filter(s -> s.getGrade() != null)
                .map(HomeworkSubmission::getGrade)
                .toList();

        long g90 = grades.stream().filter(g -> g >= 90).count();
        long g75 = grades.stream().filter(g -> g >= 75 && g < 90).count();
        long g60 = grades.stream().filter(g -> g >= 60 && g < 75).count();
        long gLow = grades.stream().filter(g -> g < 60).count();

        List<CourseAnalyticsResponse.GradeDistributionItem> gradeDistribution = List.of(
                CourseAnalyticsResponse.GradeDistributionItem.builder().label("90–100").count(g90).build(),
                CourseAnalyticsResponse.GradeDistributionItem.builder().label("75–89").count(g75).build(),
                CourseAnalyticsResponse.GradeDistributionItem.builder().label("60–74").count(g60).build(),
                CourseAnalyticsResponse.GradeDistributionItem.builder().label("< 60").count(gLow).build()
        );

        // ── Attendance trend per lesson ──────────────────────────────────────
        Map<UUID, List<Attendance>> attendanceByLesson = attendances.stream()
                .collect(Collectors.groupingBy(a -> a.getLesson().getId()));

        List<CourseAnalyticsResponse.AttendanceTrendItem> attendanceTrend = new ArrayList<>();
        for (int i = 0; i < lessons.size(); i++) {
            Lesson lesson = lessons.get(i);
            List<Attendance> lessonAttendances = attendanceByLesson.getOrDefault(lesson.getId(), Collections.emptyList());
            long present = lessonAttendances.stream()
                    .filter(a -> a.getStatus() == AttendanceStatus.PRESENT || a.getStatus() == AttendanceStatus.LATE)
                    .count();
            double rate = totalStudents > 0
                    ? Math.round((present * 100.0 / totalStudents) * 10.0) / 10.0
                    : 0.0;
            attendanceTrend.add(CourseAnalyticsResponse.AttendanceTrendItem.builder()
                    .lessonId(lesson.getId())
                    .lesson("Урок " + (i + 1))
                    .rate(rate)
                    .scheduledAt(lesson.getScheduledAt())
                    .build());
        }

        // ── Top / Bottom students by avg grade ──────────────────────────────
        // Группируем сабмиты с оценками по студентам
        Map<UUID, List<Integer>> gradesByStudent = submissions.stream()
                .filter(s -> s.getGrade() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getStudent().getId(),
                        Collectors.mapping(HomeworkSubmission::getGrade, Collectors.toList())
                ));

        // Для имён нам нужен маппинг userId -> User, берём из submissions
        Map<UUID, User> studentUsers = submissions.stream()
                .filter(s -> s.getGrade() != null)
                .collect(Collectors.toMap(
                        s -> s.getStudent().getId(),
                        HomeworkSubmission::getStudent,
                        (a, b) -> a
                ));

        List<CourseAnalyticsResponse.StudentRankItem> rankedStudents = gradesByStudent.entrySet().stream()
                .map(entry -> {
                    UUID sUserId = entry.getKey();
                    double avg = entry.getValue().stream().mapToInt(Integer::intValue).average().orElse(0);
                    User u = studentUsers.get(sUserId);
                    return CourseAnalyticsResponse.StudentRankItem.builder()
                            .userId(sUserId)
                            .firstName(u != null ? u.getFirstName() : "")
                            .lastName(u != null ? u.getLastName() : "")
                            .avg(Math.round(avg * 10.0) / 10.0)
                            .build();
                })
                .sorted(Comparator.comparingDouble(CourseAnalyticsResponse.StudentRankItem::getAvg).reversed())
                .toList();

        List<CourseAnalyticsResponse.StudentRankItem> topStudents = rankedStudents.stream().limit(3).toList();
        List<CourseAnalyticsResponse.StudentRankItem> bottomStudents = rankedStudents.isEmpty()
                ? Collections.emptyList()
                : rankedStudents.stream()
                        .skip(Math.max(0, rankedStudents.size() - 3))
                        .sorted(Comparator.comparingDouble(CourseAnalyticsResponse.StudentRankItem::getAvg))
                        .toList();

        return CourseAnalyticsResponse.builder()
                .courseId(courseId)
                .courseName(course.getName())
                .avgGrade(avgGrade)
                .totalStudents(totalStudents)
                .submissionRate(submissionRate)
                .attendanceRate(attendanceRate)
                .gradeDistribution(gradeDistribution)
                .attendanceTrend(attendanceTrend)
                .topStudents(topStudents)
                .bottomStudents(bottomStudents)
                .build();
    }
}
