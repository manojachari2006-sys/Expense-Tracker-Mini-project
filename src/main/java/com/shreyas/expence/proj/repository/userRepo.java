package com.shreyas.expence.proj.repository;

import com.shreyas.expence.proj.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface userRepo extends JpaRepository<User,Integer> {
    Optional<User> findByEmail(String email);
}
