package com.shreyas.expence.proj.repository;

import com.shreyas.expence.proj.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface expenseRepo extends JpaRepository<Expense,Integer> {
    List<Expense> findByCategory(String category);

    List<Expense> findByDateBetween(LocalDate startDate, LocalDate endDate);
}

