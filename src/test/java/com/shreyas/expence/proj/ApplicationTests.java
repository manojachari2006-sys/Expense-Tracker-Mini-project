package com.shreyas.expence.proj;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.shreyas.expence.proj.dto.UserRequest;
import com.shreyas.expence.proj.dto.UserResponse;
import com.shreyas.expence.proj.model.User;
import com.shreyas.expence.proj.repository.userRepo;
import com.shreyas.expence.proj.service.userServices;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ApplicationTests {

	@Autowired
	private userServices userService;

	@Autowired
	private userRepo users;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Test
	void contextLoads() {
	}

	@Test
	void registrationStoresOnlyBcryptHashAndReturnsSafeUser() {
		String rawPassword = "Phase4-test-password-29!";
		UserRequest request = new UserRequest();
		request.setName("Hash Verification");
		request.setEmail("hash-check-" + UUID.randomUUID() + "@example.com");
		request.setPassword(rawPassword);

		UserResponse response = userService.register(request);
		User stored = users.findByEmail(request.getEmail()).orElseThrow();

		assertNotEquals(rawPassword, stored.getPassword());
		assertTrue(stored.getPassword().startsWith("$2a$")
				|| stored.getPassword().startsWith("$2b$")
				|| stored.getPassword().startsWith("$2y$"));
		assertTrue(passwordEncoder.matches(rawPassword, stored.getPassword()));
		assertEquals(request.getEmail(), response.getEmail());
		assertEquals(request.getName(), response.getName());
	}

}
