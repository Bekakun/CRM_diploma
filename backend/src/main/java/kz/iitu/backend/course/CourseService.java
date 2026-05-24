package kz.iitu.backend.course;

import kz.iitu.backend.course.dto.CourseResponse;
import kz.iitu.backend.course.dto.CreateCourseRequest;
import kz.iitu.backend.course.dto.UpdateCourseRequest;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ConflictException;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    @Transactional
    public CourseResponse createCourse(CreateCourseRequest request, UUID instructorId) {
        log.info("Creating course '{}' for instructor {}", request.getName(), instructorId);

        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("Instructor not found"));

        if (instructor.getRole() != UserRole.INSTRUCTOR && instructor.getRole() != UserRole.ADMIN
                && instructor.getRole() != UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("Only instructors and admins can create courses");
        }

        validateCourseDates(request.getStartDate(), request.getEndDate());

        if (courseRepository.existsByNameAndInstructorId(request.getName(), instructorId)) {
            throw new ConflictException("Course with this name already exists for this instructor");
        }

        Course course = Course.builder()
                .name(request.getName())
                .description(request.getDescription())
                .instructor(instructor)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .totalLessons(request.getTotalLessons())
                .enrolledStudents(0)
                .build();

        course = courseRepository.save(course);
        log.info("Course created successfully with ID: {}", course.getId());

        return mapToResponse(course);
    }

    @Transactional(readOnly = true)
    public Page<CourseResponse> getCoursesByInstructor(UUID instructorId, Pageable pageable) {
        log.info("Fetching courses for instructor {}", instructorId);

        if (!userRepository.existsById(instructorId)) {
            throw new ResourceNotFoundException("Instructor not found");
        }

        return courseRepository.findByInstructorId(instructorId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourseById(UUID courseId, UUID requestingUserId) {
        log.info("Fetching course {} for user {}", courseId, requestingUserId);

        Course course = courseRepository.findByIdWithInstructor(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        User requestingUser = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (requestingUser.getRole() != UserRole.ADMIN
                && requestingUser.getRole() != UserRole.SUPER_ADMIN
                && !course.getInstructor().getId().equals(requestingUserId)) {
            throw new ForbiddenException("You do not have access to this course");
        }

        return mapToResponse(course);
    }

    @Transactional
    public CourseResponse updateCourse(UUID courseId, UpdateCourseRequest request, UUID instructorId) {
        log.info("Updating course {} by instructor {}", courseId, instructorId);

        Course course = courseRepository.findByIdWithInstructor(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        User requestingUser = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (requestingUser.getRole() != UserRole.ADMIN
                && requestingUser.getRole() != UserRole.SUPER_ADMIN
                && !course.getInstructor().getId().equals(instructorId)) {
            throw new ForbiddenException("You do not have permission to update this course");
        }

        if (request.getName() != null) {
            if (courseRepository.existsByNameAndInstructorIdAndIdNot(
                    request.getName(), course.getInstructor().getId(), courseId)) {
                throw new ConflictException("Course with this name already exists for this instructor");
            }
            course.setName(request.getName());
        }

        if (request.getDescription() != null) {
            course.setDescription(request.getDescription());
        }

        if (request.getStartDate() != null) {
            course.setStartDate(request.getStartDate());
        }

        if (request.getEndDate() != null) {
            course.setEndDate(request.getEndDate());
        }

        validateCourseDates(course.getStartDate(), course.getEndDate());

        if (request.getTotalLessons() != null) {
            course.setTotalLessons(request.getTotalLessons());
        }

        course = courseRepository.save(course);
        log.info("Course {} updated successfully", courseId);

        return mapToResponse(course);
    }

    @Transactional
    public void deleteCourse(UUID courseId, UUID instructorId) {
        log.info("Deleting course {} by instructor {}", courseId, instructorId);

        Course course = courseRepository.findByIdWithInstructor(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        User requestingUser = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (requestingUser.getRole() != UserRole.SUPER_ADMIN
                && !course.getInstructor().getId().equals(instructorId)) {
            throw new ForbiddenException("You do not have permission to delete this course");
        }

        if (course.getEnrolledStudents() != null && course.getEnrolledStudents() > 0) {
            throw new ConflictException("Cannot delete course with enrolled students");
        }

        courseRepository.delete(course);
        log.info("Course {} deleted successfully", courseId);
    }

    private void validateCourseDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (startDate == null) {
            throw new BadRequestException("Start date is required");
        }

        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BadRequestException("End date must be after or equal to start date");
        }
    }

    private CourseResponse mapToResponse(Course course) {
        CourseResponse.InstructorInfo instructorInfo = null;

        if (course.getInstructor() != null) {
            instructorInfo = CourseResponse.InstructorInfo.builder()
                    .id(course.getInstructor().getId())
                    .firstName(course.getInstructor().getFirstName())
                    .lastName(course.getInstructor().getLastName())
                    .email(course.getInstructor().getEmail())
                    .build();
        }

        return CourseResponse.builder()
                .id(course.getId())
                .name(course.getName())
                .description(course.getDescription())
                .instructor(instructorInfo)
                .startDate(course.getStartDate())
                .endDate(course.getEndDate())
                .totalLessons(course.getTotalLessons())
                .enrolledStudents(course.getEnrolledStudents())
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }
}
