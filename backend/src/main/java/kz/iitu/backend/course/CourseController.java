package kz.iitu.backend.course;

import jakarta.validation.Valid;
import kz.iitu.backend.course.dto.CourseAnalyticsResponse;
import kz.iitu.backend.course.dto.CourseResponse;
import kz.iitu.backend.course.dto.CreateCourseRequest;
import kz.iitu.backend.course.dto.UpdateCourseRequest;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/instructor/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;
    private final CourseAnalyticsService courseAnalyticsService;

    @PostMapping
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<CourseResponse> createCourse(
            @Valid @RequestBody CreateCourseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/instructor/courses - Creating course by user {}", userDetails.getId());
        CourseResponse response = courseService.createCourse(request, userDetails.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<CourseResponse>> getCourses(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        log.info("GET /api/v1/instructor/courses - Fetching courses for user {}", userDetails.getId());
        Page<CourseResponse> courses = courseService.getCoursesByInstructor(userDetails.getId(), pageable);
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<CourseResponse> getCourseById(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/courses/{} - Fetching course by user {}", courseId, userDetails.getId());
        CourseResponse response = courseService.getCourseById(courseId, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<CourseResponse> updateCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody UpdateCourseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("PATCH /api/v1/instructor/courses/{} - Updating course by user {}", courseId, userDetails.getId());
        CourseResponse response = courseService.updateCourse(courseId, request, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{courseId}/analytics")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<CourseAnalyticsResponse> getCourseAnalytics(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/courses/{}/analytics - requested by user {}", courseId, userDetails.getId());
        UserRole role = userDetails.getUser().getRole();
        CourseAnalyticsResponse response = courseAnalyticsService.getCourseAnalytics(courseId, userDetails.getId(), role);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("DELETE /api/v1/instructor/courses/{} - Deleting course by user {}", courseId, userDetails.getId());
        courseService.deleteCourse(courseId, userDetails.getId());
        return ResponseEntity.noContent().build();
    }
}
