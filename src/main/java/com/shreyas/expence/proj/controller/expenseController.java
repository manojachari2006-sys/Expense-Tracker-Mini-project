package com.shreyas.expence.proj.controller;

import com.shreyas.expence.proj.dto.ExpenseRequest;
import com.shreyas.expence.proj.dto.ExpenseResponse;
import com.shreyas.expence.proj.service.expenseServices;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/")
public class expenseController {

    @GetMapping("/login")
    public ResponseEntity<String> Greet(){
        return new ResponseEntity<>("fuck you", HttpStatus.OK);

    }

    private expenseServices service;

    public expenseController(expenseServices service) {
        this.service = service;
    }

    @GetMapping("/expenses")
    public ResponseEntity<List<ExpenseResponse>> getExpense(@AuthenticationPrincipal Jwt jwt){
        List<ExpenseResponse> expenses = service.getExpense(userId(jwt));
        return new ResponseEntity<>(expenses,HttpStatus.OK);
    }

    @GetMapping("/expense/{id}")
    public ResponseEntity<ExpenseResponse> getExpenseById(@PathVariable int id, @AuthenticationPrincipal Jwt jwt){
        return new ResponseEntity<>(service.getExpenseById(id, userId(jwt)), HttpStatus.OK);
    }


    @PostMapping("/expense")
    public ResponseEntity<ExpenseResponse> addExpesce(@Valid @RequestBody ExpenseRequest expenseRequest,
                                                      @AuthenticationPrincipal Jwt jwt){
        ExpenseResponse response = service.addExpense(expenseRequest, userId(jwt));
        return new ResponseEntity<>(response,HttpStatus.CREATED);

    }

    @PutMapping("/expense/{id}")
    public ResponseEntity<ExpenseResponse> updateExpense(@PathVariable int id, @Valid @RequestBody ExpenseRequest expenseRequest,
                                                         @AuthenticationPrincipal Jwt jwt){
        ExpenseResponse response = service.updateExpense(id,expenseRequest, userId(jwt));
        return new ResponseEntity<>(response,HttpStatus.OK);
    }

    @DeleteMapping("expense/{id}")
    public ResponseEntity<String> deleteExpense(@PathVariable int id, @AuthenticationPrincipal Jwt jwt){
        service.deleteExpense(id, userId(jwt));
        return new ResponseEntity<>("Deleted Successfully",HttpStatus.OK);
    }

    @GetMapping("expenses/filter")
    public ResponseEntity<List<ExpenseResponse>> findByCategory(@RequestParam String category, @AuthenticationPrincipal Jwt jwt) {
        List<ExpenseResponse> responses = service.findByCategory(category, userId(jwt));
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }

    @GetMapping("/expenses/filter/date")
    public ResponseEntity<List<ExpenseResponse>> findByDateBetween(@RequestParam LocalDate startDate, @RequestParam LocalDate endDate,
                                                                   @AuthenticationPrincipal Jwt jwt){
        List<ExpenseResponse> responses = service.findByDateBetween(startDate,endDate,userId(jwt));
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }

    @GetMapping("/expenses/sort")
    public ResponseEntity<List<ExpenseResponse>> findByAmountOrderBy(@RequestParam String by,@RequestParam String direction,
                                                                     @AuthenticationPrincipal Jwt jwt){
        List<ExpenseResponse> responses = service.findByAmountOrderBy(by,direction,userId(jwt));
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }

    @GetMapping("/expenses/page")
    public ResponseEntity<List<ExpenseResponse>> findByPagination(@RequestParam int page,@RequestParam int size,
                                                                  @AuthenticationPrincipal Jwt jwt){
        Pageable pageable = PageRequest.of(page,size);
        List<ExpenseResponse> responses = service.findByPagination(pageable,userId(jwt));
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }

    private Integer userId(Jwt jwt) {
        return Integer.valueOf(jwt.getSubject());
    }
}
