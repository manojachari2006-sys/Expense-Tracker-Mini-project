package com.shreyas.expence.proj.controller;

import com.shreyas.expence.proj.dto.UserRequest;
import com.shreyas.expence.proj.dto.UserResponse;
import com.shreyas.expence.proj.service.userServices;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
public class userController {
    private final userServices service;

    public userController(userServices service) {
        this.service = service;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody UserRequest request){
        UserResponse response = service.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody UserRequest request){
        UserResponse response = service.login(request);
        return new ResponseEntity<>(response,HttpStatus.OK);
    }

}
