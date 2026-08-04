package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.UserDTO;
import java.util.List;
import java.util.Optional;

public interface UserService {

    List<UserDTO> findAll();

    Optional<UserDTO> findById(Long id);

    UserDTO save(UserDTO userDTO);

    UserDTO update(Long id, UserDTO userDTO);

    void delete(Long id);
}
