package com.shreyas.expence.proj.service;

import com.shreyas.expence.proj.dto.ExpenseRequest;
import com.shreyas.expence.proj.dto.ExpenseResponse;
import com.shreyas.expence.proj.model.Expense;
import com.shreyas.expence.proj.model.User;
import com.shreyas.expence.proj.repository.expenseRepo;
import com.shreyas.expence.proj.repository.userRepo;
import com.shreyas.expence.proj.exception.ExpenseNotFoundException;
import com.shreyas.expence.proj.exception.UserNotFoundException;
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
    private final userRepo userRepository;

    public expenseServices(expenseRepo repo, userRepo userRepository){
        this.repo = repo;
        this.userRepository = userRepository;
    }

    public List<ExpenseResponse> getExpense(Integer userId) {
        return repo.findAllByUser_Id(userId).stream().map(this::mapToResponse).toList();
    }

    public ExpenseResponse addExpense(ExpenseRequest expenseRequest, Integer userId) {
        Expense expense = new Expense();
        expense.setAmount(expenseRequest.getAmount());

        expense.setCategory(expenseRequest.getCategory());

        expense.setDescription(expenseRequest.getDescription());

        expense.setDate(expenseRequest.getDate());
        expense.setUser(findUser(userId));

        Expense savedExpense = repo.save(expense);
        return mapToResponse(savedExpense);
    }

    public ExpenseResponse getExpenseById(int id, Integer userId){
        return repo.findByIdAndUser_Id(id, userId).map(this::mapToResponse)
                .orElseThrow(() -> new ExpenseNotFoundException("Expense not found"));
    }


    public ExpenseResponse updateExpense(int id, ExpenseRequest expenseRequest, Integer userId) {
        Expense existingExpense = findOwnedExpense(id, userId);
            existingExpense.setAmount(expenseRequest.getAmount());
            existingExpense.setCategory(expenseRequest.getCategory());
            existingExpense.setDescription(expenseRequest.getDescription());
            existingExpense.setDate(expenseRequest.getDate());

            Expense updatedExpense = repo.save(existingExpense);
        return mapToResponse(updatedExpense);
    }

    public void deleteExpense(int id, Integer userId) {
        repo.delete(findOwnedExpense(id, userId));
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

    public List<ExpenseResponse> findByCategory(String category, Integer userId) {
        List<Expense> expenses = repo.findByCategoryAndUser_Id(category, userId);
        return expenses.stream().map(this::mapToResponse).toList();
    }

    public List<ExpenseResponse> findByDateBetween(LocalDate startDate, LocalDate endDate, Integer userId) {
        List<Expense> expenses = repo.findByDateBetweenAndUser_Id(startDate,endDate,userId);
        return expenses.stream().map(this::mapToResponse).toList();
    }

    public List<ExpenseResponse> findByAmountOrderBy(String by, String direction, Integer userId) {
        Sort.Direction sortDirection;
        if(direction.equalsIgnoreCase("desc")){
            sortDirection=Sort.Direction.DESC;
        }
        else{
            sortDirection=Sort.Direction.ASC;
        }
        Sort sort = Sort.by(sortDirection,by);

        List<Expense> expenses = repo.findAllByUser_Id(userId, sort);
        return expenses.stream().map(this::mapToResponse).toList();
    }

    public List<ExpenseResponse> findByPagination(Pageable pageable, Integer userId) {
        Page<Expense> expenses = repo.findAllByUser_Id(userId, pageable);
        return expenses.getContent().stream().map(this::mapToResponse).toList();
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Authenticated user not found"));
    }

    private Expense findOwnedExpense(int id, Integer userId) {
        Optional<Expense> expense = repo.findByIdAndUser_Id(id, userId);
        return expense.orElseThrow(() -> new ExpenseNotFoundException("Expense not found"));
    }
}
