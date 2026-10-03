package com.shreyas.expence.proj.service;

import com.shreyas.expence.proj.dto.UserRequest;
import com.shreyas.expence.proj.dto.UserResponse;
import com.shreyas.expence.proj.exception.EmailAlreadyExistsException;
import com.shreyas.expence.proj.exception.InvalidPasswordException;
import com.shreyas.expence.proj.exception.UserNotFoundException;
import com.shreyas.expence.proj.model.User;
import com.shreyas.expence.proj.repository.userRepo;
import jakarta.validation.Valid;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class userServices {
    private final userRepo repo;

    public userServices(userRepo repo) {
        this.repo = repo;
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
            user1.setPassword(request.getPassword());
            User saveduser = repo.save(user1);
            return new UserResponse(
                    saveduser.getId(),
                    saveduser.getName(),
                    saveduser.getEmail()
            );
        }
    }

    public UserResponse login(@Valid UserRequest request) {
        Optional<User> user = repo.findByEmail(request.getEmail());
        if(user.isPresent()){
            User existingUser = user.get();
            String pass = request.getPassword();
            if(existingUser.getPassword().equals(pass)){
                return new UserResponse(
                        existingUser.getId(),
                        existingUser.getName(),
                        existingUser.getEmail()
                );
            }
            else{
                throw new InvalidPasswordException("Incorrect Password");
            }
        }
        else{
            throw new UserNotFoundException("Account already exists, Please register first");
        }
    }
}
