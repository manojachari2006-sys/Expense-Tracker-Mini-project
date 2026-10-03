package com.shreyas.expence.proj.service;

import com.shreyas.expence.proj.dto.ExpenseRequest;
import com.shreyas.expence.proj.dto.ExpenseResponse;
import com.shreyas.expence.proj.model.Expense;
import com.shreyas.expence.proj.repository.expenseRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class expenseServices {

    private expenseRepo repo;

    public expenseServices(expenseRepo repo){
        this.repo = repo;
    }

    public List<ExpenseResponse> getExpense() {
        return repo.findAll().stream().map(this::mapToResponse).toList();
    }

    public ExpenseResponse addExpense(ExpenseRequest expenseRequest) {
        Expense expense = new Expense();
        expense.setAmount(expenseRequest.getAmount());

        expense.setCategory(expenseRequest.getCategory());

        expense.setDescription(expenseRequest.getDescription());

        expense.setDate(expenseRequest.getDate());

        Expense savedExpense = repo.save(expense);
        return mapToResponse(savedExpense);
    }

    public Optional<ExpenseResponse> getExpenseById(int id){
        return repo.findById(id).map(this::mapToResponse);
    }


    public ExpenseResponse updateExpense(int id, ExpenseRequest expenseRequest) {
        Expense existingExpense = repo.findById(id).orElse(null);
        if(existingExpense == null) {
            return null;
        }
            existingExpense.setAmount(expenseRequest.getAmount());
            existingExpense.setCategory(expenseRequest.getCategory());
            existingExpense.setDescription(expenseRequest.getDescription());
            existingExpense.setDate(expenseRequest.getDate());

            Expense updatedExpense = repo.save(existingExpense);
        return mapToResponse(updatedExpense);
    }

    public void deleteExpense(int id) {
        repo.deleteById(id);
    }

    private ExpenseResponse mapToResponse(Expense expense){
        ExpenseResponse response = new ExpenseResponse();

        response.setId(expense.getId());
        response.setAmount(expense.getAmount());
        response.setCategory(expense.getCategory());
        response.setDescription(expense.getDescription());
        response.setDate(expense.getDate());
        return response;
    }

    public List<ExpenseResponse> findByCategory(String category) {
        List<Expense> expenses = repo.findByCategory(category);
        return expenses.stream().map(this::mapToResponse).toList();
    }

    public List<ExpenseResponse> findByDateBetween(LocalDate startDate, LocalDate endDate) {
        List<Expense> expenses = repo.findByDateBetween(startDate,endDate);
        return expenses.stream().map(this::mapToResponse).toList();
    }

    public List<ExpenseResponse> findByAmountOrderBy(String by, String direction) {
        Sort.Direction sortDirection;
        if(direction.equalsIgnoreCase("desc")){
            sortDirection=Sort.Direction.DESC;
        }
        else{
            sortDirection=Sort.Direction.ASC;
        }
        Sort sort = Sort.by(sortDirection,by);

        List<Expense> expenses = repo.findAll(sort);
        return expenses.stream().map(this::mapToResponse).toList();
    }

    public List<ExpenseResponse> findByPagination(Pageable pageable) {
        Page<Expense> expenses = repo.findAll(pageable);
        return expenses.getContent().stream().map(this::mapToResponse).toList();
    }
}
