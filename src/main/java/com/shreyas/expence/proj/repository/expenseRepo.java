package com.shreyas.expence.proj.repository;

import com.shreyas.expence.proj.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Repository
public interface expenseRepo extends JpaRepository<Expense,Integer> {
    List<Expense> findAllByUser_Id(Integer userId);

    Optional<Expense> findByIdAndUser_Id(Integer id, Integer userId);

    List<Expense> findByCategoryAndUser_Id(String category, Integer userId);

    List<Expense> findByDateBetweenAndUser_Id(LocalDate startDate, LocalDate endDate, Integer userId);

    List<Expense> findAllByUser_Id(Integer userId, Sort sort);

    Page<Expense> findAllByUser_Id(Integer userId, Pageable pageable);
}

