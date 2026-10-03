package com.shreyas.expence.proj.dto;

public record ApiError(int status, String error, String message) {
}
