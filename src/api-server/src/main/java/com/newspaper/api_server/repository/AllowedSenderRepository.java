package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.AllowedSender;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AllowedSenderRepository extends JpaRepository<AllowedSender, Long> {

    List<AllowedSender> findAllByOrderByIdAsc();
}
