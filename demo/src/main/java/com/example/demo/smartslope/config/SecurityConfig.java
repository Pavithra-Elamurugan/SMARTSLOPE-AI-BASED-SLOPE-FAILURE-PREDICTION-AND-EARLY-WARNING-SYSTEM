package com.example.demo.smartslope.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(customAuthenticationEntryPoint)
                .accessDeniedHandler(customAccessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Public Authentication Endpoints
                .requestMatchers("/api/auth/**").permitAll()
                
                // Users Management API -> ADMIN only
                .requestMatchers("/api/users/**").hasRole("ADMIN")
                
                // Sites API permissions
                .requestMatchers(HttpMethod.GET, "/api/sites/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER")
                .requestMatchers(HttpMethod.POST, "/api/sites/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.PUT, "/api/sites/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.DELETE, "/api/sites/**").hasAnyRole("ADMIN", "ENGINEER")
                
                // Predictions API permissions -> Custom evaluation restricted to ADMIN & ENGINEER
                .requestMatchers(HttpMethod.GET, "/api/predictions/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER")
                .requestMatchers("/api/predictions/evaluate/**", "/api/predictions/evaluate-site/**", "/api/predictions/analyze-location", "/api/predictions/simulate-storm/**")
                    .hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.POST, "/api/predictions/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.PUT, "/api/predictions/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.DELETE, "/api/predictions/**").hasRole("ADMIN")
                
                // Inspections API permissions -> Restrict to ADMIN, ENGINEER, SAFETY_OFFICER
                .requestMatchers(HttpMethod.GET, "/api/inspections/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER")
                .requestMatchers(HttpMethod.POST, "/api/inspections/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.PUT, "/api/inspections/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.DELETE, "/api/inspections/**").hasRole("ADMIN")
                
                // Incidents API permissions
                .requestMatchers(HttpMethod.GET, "/api/incidents/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER")
                .requestMatchers(HttpMethod.POST, "/api/incidents/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER")
                .requestMatchers(HttpMethod.PUT, "/api/incidents/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER")
                .requestMatchers(HttpMethod.DELETE, "/api/incidents/**").hasRole("ADMIN")
                
                // Alerts API permissions -> PUBLIC_USER can read, SAFETY_OFFICER/ENGINEER/ADMIN can update/create
                .requestMatchers(HttpMethod.GET, "/api/alerts/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER")
                .requestMatchers(HttpMethod.PUT, "/api/alerts/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER")
                .requestMatchers(HttpMethod.POST, "/api/alerts/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER")
                .requestMatchers(HttpMethod.DELETE, "/api/alerts/**").hasRole("ADMIN")
                
                // Telemetry Sensor Data API permissions -> PUBLIC_USER can read, ENGINEER/ADMIN can push
                .requestMatchers(HttpMethod.GET, "/api/sensor-data/**").hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER")
                .requestMatchers(HttpMethod.POST, "/api/sensor-data/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.PUT, "/api/sensor-data/**").hasAnyRole("ADMIN", "ENGINEER")
                .requestMatchers(HttpMethod.DELETE, "/api/sensor-data/**").hasRole("ADMIN")

                // All other operational endpoints require authenticated non-pending role
                .anyRequest().hasAnyRole("ADMIN", "ENGINEER", "SAFETY_OFFICER", "PUBLIC_USER")
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
