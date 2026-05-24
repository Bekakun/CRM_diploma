package kz.iitu.backend.attendance;

import kz.iitu.backend.attendance.dto.AttendanceResponse;
import kz.iitu.backend.attendance.dto.BulkAttendanceResponse;
import kz.iitu.backend.attendance.dto.MarkAttendanceRequest;
import kz.iitu.backend.attendance.dto.UpdateAttendanceRequest;
import kz.iitu.backend.lesson.Lesson;
import kz.iitu.backend.lesson.LessonRepository;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    @Transactional
    public BulkAttendanceResponse markAttendance(UUID lessonId, MarkAttendanceRequest request, UUID instructorId) {
        log.info("Marking attendance for lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        validateInstructorAccess(lesson, instructorId);

        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<AttendanceResponse> responses = new ArrayList<>();

        for (MarkAttendanceRequest.AttendanceItem item : request.getAttendance()) {
            User student = userRepository.findById(item.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + item.getStudentId()));

            // TODO: Проверить что студент записан на курс

            Attendance attendance = attendanceRepository
                    .findByLessonIdAndStudentId(lessonId, item.getStudentId())
                    .orElse(Attendance.builder()
                            .lesson(lesson)
                            .student(student)
                            .build());

            attendance.setStatus(item.getStatus());
            attendance.setNotes(item.getNotes());
            attendance.setMarkedBy(instructor);

            attendance = attendanceRepository.save(attendance);
            responses.add(mapToResponse(attendance));
        }

        log.info("Marked attendance for {} students in lesson {}", responses.size(), lessonId);

        return BulkAttendanceResponse.builder()
                .updated(responses.size())
                .attendance(responses)
                .build();
    }

    @Transactional
    public AttendanceResponse updateAttendance(UUID attendanceId, UpdateAttendanceRequest request, UUID instructorId) {
        log.info("Updating attendance {} by instructor {}", attendanceId, instructorId);

        Attendance attendance = attendanceRepository.findByIdWithLessonAndCourse(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        validateInstructorAccess(attendance.getLesson(), instructorId);

        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        attendance.setStatus(request.getStatus());
        if (request.getNotes() != null) {
            attendance.setNotes(request.getNotes());
        }
        attendance.setMarkedBy(instructor);

        attendance = attendanceRepository.save(attendance);
        log.info("Attendance {} updated successfully", attendanceId);

        return mapToResponse(attendance);
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> getLessonAttendance(UUID lessonId) {
        log.info("Fetching attendance for lesson {}", lessonId);

        if (!lessonRepository.existsById(lessonId)) {
            throw new ResourceNotFoundException("Lesson not found");
        }

        return attendanceRepository.findByLessonId(lessonId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private void validateInstructorAccess(Lesson lesson, UUID instructorId) {
        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UUID courseInstructorId = lesson.getCourse().getInstructor().getId();

        if (instructor.getRole() != UserRole.ADMIN
                && instructor.getRole() != UserRole.SUPER_ADMIN
                && !courseInstructorId.equals(instructorId)) {
            throw new ForbiddenException("You do not have permission to manage attendance for this lesson");
        }
    }

    private AttendanceResponse mapToResponse(Attendance attendance) {
        return AttendanceResponse.builder()
                .id(attendance.getId())
                .lessonId(attendance.getLesson().getId())
                .studentId(attendance.getStudent().getId())
                .status(attendance.getStatus())
                .notes(attendance.getNotes())
                .markedAt(attendance.getMarkedAt())
                .markedBy(attendance.getMarkedBy() != null ? attendance.getMarkedBy().getId() : null)
                .build();
    }
}
