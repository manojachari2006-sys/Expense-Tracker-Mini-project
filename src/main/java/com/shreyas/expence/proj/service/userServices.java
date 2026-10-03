package com.shreyas.expence.proj.service;

import com.shreyas.expence.proj.dto.UserRequest;
import com.shreyas.expence.proj.dto.UserResponse;
import com.shreyas.expence.proj.dto.LoginRequest;
import com.shreyas.expence.proj.dto.LoginResponse;
import com.shreyas.expence.proj.exception.EmailAlreadyExistsException;
import com.shreyas.expence.proj.model.User;
import com.shreyas.expence.proj.repository.userRepo;
import com.shreyas.expence.proj.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class userServices {
    private final userRepo repo;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public userServices(userRepo repo, PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager, JwtService jwtService) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public UserResponse register(UserRequest request) {
        Optional<User> user = repo.findByEmail(request.getEmail());
        if(user.isPresent()){
            throw new EmailAlreadyExistsException("Email already exists");
        }
        else {
            User user1 = new User();
            user1.setName(request.getName());
            user1.setEmail(request.getEmail());
            user1.setPassword(passwordEncoder.encode(request.getPassword()));
            User saveduser = repo.save(user1);
            return new UserResponse(
                    saveduser.getId(),
                    saveduser.getName(),
                    saveduser.getEmail()
            );
        }
    }

    public LoginResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (AuthenticationException exception) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User authenticatedUser = repo.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        UserResponse safeUser = new UserResponse(authenticatedUser.getId(),
                authenticatedUser.getName(), authenticatedUser.getEmail());
        return new LoginResponse(jwtService.generateToken(authenticatedUser), "Bearer",
                jwtService.getExpirationSeconds(), safeUser);
    }
}
