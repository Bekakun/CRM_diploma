package kz.iitu.backend.student;

import kz.iitu.backend.attendance.Attendance;
import kz.iitu.backend.attendance.AttendanceRepository;
import kz.iitu.backend.course.Course;
import kz.iitu.backend.course.CourseRepository;
import kz.iitu.backend.homework.Homework;
import kz.iitu.backend.homework.HomeworkRepository;
import kz.iitu.backend.lesson.Lesson;
import kz.iitu.backend.lesson.LessonRepository;
import kz.iitu.backend.payment.PaymentGenerationService;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ConflictException;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.student.dto.DeadlineResponse;
import kz.iitu.backend.student.dto.EnrollStudentRequest;
import kz.iitu.backend.student.dto.StudentPerformanceResponse;
import kz.iitu.backend.student.dto.StudentResponse;
import kz.iitu.backend.submission.HomeworkSubmission;
import kz.iitu.backend.submission.HomeworkSubmissionRepository;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final HomeworkRepository homeworkRepository;
    private final AttendanceRepository attendanceRepository;
    private final HomeworkSubmissionRepository submissionRepository;
    private final PaymentGenerationService paymentGenerationService;

    @Transactional
    public List<StudentResponse> enrollStudent(UUID userId, EnrollStudentRequest request) {
        log.info("Enrolling user {} in courses {}", userId, request.getCourseIds());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.STUDENT) {
            throw new BadRequestException("Only users with STUDENT role can be enrolled in courses");
        }

        if (request.getCourseIds() == null || request.getCourseIds().isEmpty()) {
            throw new BadRequestException("At least one course ID is required");
        }

        List<StudentResponse> enrollments = new ArrayList<>();

        for (UUID courseId : request.getCourseIds()) {
            Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

            if (studentRepository.existsByUserIdAndCourseId(userId, courseId)) {
                throw new ConflictException("Student is already enrolled in course: " + course.getName());
            }

            Student student = Student.builder()
                    .user(user)
                    .course(course)
                    .averageGrade(null)
                    .attendanceRate(0.0)
                    .homeworkCompletionRate(0.0)
                    .build();

            student = studentRepository.save(student);

            // Update course enrolled students count
            course.setEnrolledStudents((course.getEnrolledStudents() != null ? course.getEnrolledStudents() : 0) + 1);
            courseRepository.save(course);

            enrollments.add(mapToResponse(student));
            log.info("User {} enrolled in course {} successfully", userId, courseId);

            // Generate payments based on active payment rules
            paymentGenerationService.generatePaymentsForEnrollment(user, courseId);
        }

        return enrollments;
    }

    @Transactional(readOnly = true)
    public Page<StudentResponse> getStudentsByInstructor(UUID instructorId, UUID courseId, Pageable pageable) {
        log.info("Fetching students for instructor {} (courseId: {})", instructorId, courseId);

        if (!userRepository.existsById(instructorId)) {
            throw new ResourceNotFoundException("Instructor not found");
        }

        Page<Student> students;
        if (courseId != null) {
            Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

            if (!course.getInstructor().getId().equals(instructorId)) {
                throw new ForbiddenException("You do not have access to this course");
            }

            students = studentRepository.findAllByInstructorIdAndCourseId(instructorId, courseId, pageable);
        } else {
            students = studentRepository.findAllByInstructorId(instructorId, pageable);
        }

        return students.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getMyEnrollments(UUID userId) {
        log.info("Fetching enrollments for user {}", userId);
        return studentRepository.findAllByUserId(userId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UUID> getEnrolledCourseIds(UUID userId) {
        log.info("Fetching enrolled course IDs for user {}", userId);
        return studentRepository.findAllByUserId(userId).stream()
                .map(student -> student.getCourse().getId())
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentPerformanceResponse getStudentDetails(UUID studentId, UUID requestingUserId) {
        log.info("Fetching student details {} for user {}", studentId, requestingUserId);

        Student student = studentRepository.findByIdWithDetails(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student enrollment not found"));

        User requestingUser = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check permissions: admin, super_admin, instructor of the course, or the student themselves
        boolean hasAccess = requestingUser.getRole() == UserRole.ADMIN
                || requestingUser.getRole() == UserRole.SUPER_ADMIN
                || student.getCourse().getInstructor().getId().equals(requestingUserId)
                || student.getUser().getId().equals(requestingUserId);

        if (!hasAccess) {
            throw new ForbiddenException("You do not have access to this student's details");
        }

        return mapToPerformanceResponse(student);
    }

    @Transactional(readOnly = true)
    public StudentPerformanceResponse getStudentDetailsByUserId(UUID userId, UUID requestingUserId) {
        log.info("Fetching student details by userId {} for user {}", userId, requestingUserId);
        List<Student> enrollments = studentRepository.findAllByUserId(userId);
        if (enrollments.isEmpty()) {
            throw new ResourceNotFoundException("Student enrollment not found for user " + userId);
        }
        // Use the first enrollment — enough for analytics navigation
        Student student = enrollments.get(0);
        return getStudentDetails(student.getId(), requestingUserId);
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getStudentsByCourse(UUID courseId) {
        return studentRepository.findAllByCourseId(courseId, PageRequest.of(0, 1000))
                .getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DeadlineResponse> getMyDeadlines(UUID userId) {
        log.info("Fetching deadlines for user {}", userId);

        List<Homework> homeworks = homeworkRepository.findAllByStudentUserId(userId);

        // Загрузим все сабмиты студента одним запросом, чтобы не делать N+1
        List<HomeworkSubmission> submissions = submissionRepository.findAllByStudentId(userId);
        Map<UUID, HomeworkSubmission> submissionByHwId = submissions.stream()
                .collect(Collectors.toMap(s -> s.getHomework().getId(), s -> s));

        LocalDateTime now = LocalDateTime.now();

        return homeworks.stream().map(hw -> {
            HomeworkSubmission sub = submissionByHwId.get(hw.getId());
            String status;

            if (sub != null) {
                status = sub.getGrade() != null ? "graded" : "submitted";
            } else if (now.isAfter(hw.getDueDate())) {
                status = "overdue";
            } else {
                status = "pending";
            }

            return DeadlineResponse.builder()
                    .homeworkId(hw.getId())
                    .lessonId(hw.getLesson().getId())
                    .courseTitle(hw.getLesson().getCourse().getName())
                    .homeworkTitle(hw.getTitle())
                    .dueDate(hw.getDueDate())
                    .status(status)
                    .grade(sub != null ? sub.getGrade() : null)
                    .maxGrade(hw.getMaxGrade())
                    .feedback(sub != null ? sub.getFeedback() : null)
                    .submittedAt(sub != null ? sub.getSubmittedAt() : null)
                    .gradedAt(sub != null ? sub.getGradedAt() : null)
                    .build();
        }).toList();
    }

    private StudentResponse mapToResponse(Student student) {
        UUID studentUserId = student.getUser().getId();
        UUID courseId = student.getCourse().getId();

        long totalLessons = homeworkRepository.countLessonsByCourseId(courseId);
        long attended = attendanceRepository.countAttendedByStudentAndCourse(studentUserId, courseId);
        Double attendanceRate = totalLessons == 0 ? 0.0 : (attended * 100.0 / totalLessons);

        long totalHomeworks = homeworkRepository.countByCourseId(courseId);
        long submitted = submissionRepository.countSubmittedByStudentAndCourse(studentUserId, courseId);
        Double hwCompletionRate = totalHomeworks == 0 ? 0.0 : (submitted * 100.0 / totalHomeworks);

        Double averageGrade = submissionRepository.findAverageGradeByStudentAndCourse(studentUserId, courseId);

        return StudentResponse.builder()
                .id(student.getId())
                .userId(studentUserId)
                .firstName(student.getUser().getFirstName())
                .lastName(student.getUser().getLastName())
                .email(student.getUser().getEmail())
                .profilePhotoUrl(student.getUser().getProfilePhotoUrl())
                .courseId(courseId)
                .courseName(student.getCourse().getName())
                .averageGrade(averageGrade)
                .attendanceRate(attendanceRate)
                .homeworkCompletionRate(hwCompletionRate)
                .enrolledAt(student.getEnrolledAt())
                .build();
    }

    private StudentPerformanceResponse mapToPerformanceResponse(Student student) {
        UUID studentUserId = student.getUser().getId();
        UUID courseId = student.getCourse().getId();

        // Fetch all lessons for this course ordered by scheduledAt
        Pageable allLessons = PageRequest.of(0, 1000, Sort.by(Sort.Direction.ASC, "scheduledAt"));
        List<Lesson> lessons = lessonRepository.findByCourseId(courseId, allLessons).getContent();

        List<StudentPerformanceResponse.LessonPerformance> performance = new ArrayList<>();

        for (Lesson lesson : lessons) {
            // Attendance
            Optional<Attendance> attendance = attendanceRepository.findByLessonIdAndStudentId(lesson.getId(), studentUserId);
            StudentPerformanceResponse.LessonPerformance.AttendanceInfo attendanceInfo =
                    StudentPerformanceResponse.LessonPerformance.AttendanceInfo.builder()
                            .status(attendance.map(a -> a.getStatus().name()).orElse("NOT_MARKED"))
                            .build();

            // Homework
            StudentPerformanceResponse.LessonPerformance.HomeworkInfo hwInfo = null;
            Optional<Homework> hw = homeworkRepository.findByLessonId(lesson.getId());
            if (hw.isPresent()) {
                Homework homework = hw.get();
                StudentPerformanceResponse.LessonPerformance.HomeworkInfo.SubmissionInfo submissionInfo = null;

                Optional<HomeworkSubmission> submission = submissionRepository.findByHomeworkIdAndStudentId(homework.getId(), studentUserId);
                if (submission.isPresent()) {
                    HomeworkSubmission sub = submission.get();
                    submissionInfo = StudentPerformanceResponse.LessonPerformance.HomeworkInfo.SubmissionInfo.builder()
                            .id(sub.getId())
                            .githubUrl(sub.getGithubUrl())
                            .submittedAt(sub.getSubmittedAt() != null ? sub.getSubmittedAt().toString() : null)
                            .isLate(sub.getIsLate())
                            .grade(sub.getGrade())
                            .feedback(sub.getFeedback())
                            .gradedAt(sub.getGradedAt() != null ? sub.getGradedAt().toString() : null)
                            .build();
                }

                hwInfo = StudentPerformanceResponse.LessonPerformance.HomeworkInfo.builder()
                        .id(homework.getId())
                        .title(homework.getTitle())
                        .deadline(homework.getDueDate() != null ? homework.getDueDate().toString() : null)
                        .submission(submissionInfo)
                        .build();
            }

            performance.add(StudentPerformanceResponse.LessonPerformance.builder()
                    .lessonId(lesson.getId())
                    .lessonTitle(lesson.getTitle())
                    .lessonDate(lesson.getScheduledAt() != null ? lesson.getScheduledAt().toString() : null)
                    .attendance(attendanceInfo)
                    .homework(hwInfo)
                    .build());
        }

        // Посещаемость: уроки, где статус PRESENT или LATE / все уроки
        long attendedCount = performance.stream()
                .filter(p -> "PRESENT".equals(p.getAttendance().getStatus()) || "LATE".equals(p.getAttendance().getStatus()))
                .count();
        double attendanceRate = lessons.isEmpty() ? 0.0 : (attendedCount * 100.0 / lessons.size());

        // Выполнено ДЗ: уроки с ДЗ, где есть сабмит / все уроки с ДЗ
        long lessonsWithHw = performance.stream().filter(p -> p.getHomework() != null).count();
        long submittedCount = performance.stream()
                .filter(p -> p.getHomework() != null && p.getHomework().getSubmission() != null)
                .count();
        double hwCompletionRate = lessonsWithHw == 0 ? 0.0 : (submittedCount * 100.0 / lessonsWithHw);

        // Средний балл: среднее среди оценённых сабмитов
        List<Integer> grades = performance.stream()
                .filter(p -> p.getHomework() != null
                        && p.getHomework().getSubmission() != null
                        && p.getHomework().getSubmission().getGrade() != null)
                .map(p -> p.getHomework().getSubmission().getGrade())
                .toList();
        Double averageGrade = grades.isEmpty() ? null : grades.stream().mapToInt(Integer::intValue).average().orElse(0);

        return StudentPerformanceResponse.builder()
                .id(student.getId())
                .userId(student.getUser().getId())
                .firstName(student.getUser().getFirstName())
                .lastName(student.getUser().getLastName())
                .email(student.getUser().getEmail())
                .profilePhotoUrl(student.getUser().getProfilePhotoUrl())
                .courseId(courseId)
                .courseName(student.getCourse().getName())
                .averageGrade(averageGrade)
                .attendanceRate(attendanceRate)
                .homeworkCompletionRate(hwCompletionRate)
                .enrolledAt(student.getEnrolledAt())
                .performance(performance)
                .build();
    }
}
