package com.shreyas.expence.proj.controller;

import com.shreyas.expence.proj.dto.ExpenseRequest;
import com.shreyas.expence.proj.dto.ExpenseResponse;
import com.shreyas.expence.proj.service.expenseServices;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin
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
    public ResponseEntity<List<ExpenseResponse>> getExpense(){
        List<ExpenseResponse> expenses = service.getExpense();
        return new ResponseEntity<>(expenses,HttpStatus.OK);
    }

    @GetMapping("/expense/{id}")
    public ResponseEntity<ExpenseResponse> getExpenseById(@PathVariable int id){
        Optional<ExpenseResponse>  response= service.getExpenseById(id);
        if(response.isPresent()) {
            return new ResponseEntity<>(response.get(), HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }


    @PostMapping("/expense")
    public ResponseEntity<ExpenseResponse> addExpesce(@Valid @RequestBody ExpenseRequest expenseRequest){
        ExpenseResponse response = service.addExpense(expenseRequest);
        return new ResponseEntity<>(response,HttpStatus.CREATED);

    }

    @PutMapping("/expense/{id}")
    public ResponseEntity<ExpenseResponse> updateExpense(@PathVariable int id, @Valid @RequestBody ExpenseRequest expenseRequest){
        ExpenseResponse response = service.updateExpense(id,expenseRequest);

        if(response == null){
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(response,HttpStatus.OK);
    }

    @DeleteMapping("expense/{id}")
    public ResponseEntity<String> deleteExpense(@PathVariable int id){
        Optional<ExpenseResponse> response = service.getExpenseById(id);
        if(response.isEmpty()){
            return new ResponseEntity<>("Failed to delete",HttpStatus.NO_CONTENT);
        }
        else{
            service.deleteExpense(id);
            return new ResponseEntity<>("Deleted Successfully",HttpStatus.OK);
        }
    }

    @GetMapping("expenses/filter")
    public ResponseEntity<List<ExpenseResponse>> findByCategory(@RequestParam String category) {
        List<ExpenseResponse> responses = service.findByCategory(category);
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }

    @GetMapping("/expenses/filter/date")
    public ResponseEntity<List<ExpenseResponse>> findByDateBetween(@RequestParam LocalDate startDate, @RequestParam LocalDate endDate){
        List<ExpenseResponse> responses = service.findByDateBetween(startDate,endDate);
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }

    @GetMapping("/expenses/sort")
    public ResponseEntity<List<ExpenseResponse>> findByAmountOrderBy(@RequestParam String by,@RequestParam String direction){
        List<ExpenseResponse> responses = service.findByAmountOrderBy(by,direction);
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }

    @GetMapping("/expenses/page")
    public ResponseEntity<List<ExpenseResponse>> findByPagination(@RequestParam int page,@RequestParam int size){
        Pageable pageable = PageRequest.of(page,size);
        List<ExpenseResponse> responses = service.findByPagination(pageable);
        return new ResponseEntity<>(responses,HttpStatus.OK);
    }
}
