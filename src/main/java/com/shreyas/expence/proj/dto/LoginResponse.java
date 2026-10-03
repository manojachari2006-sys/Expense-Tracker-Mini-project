package com.shreyas.expence.proj.dto;

public record LoginResponse(String token, String tokenType, long expiresIn, UserResponse user) {
}
