package com.moneycoming.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.moneycoming.data.model.AccountWithBalance
import com.moneycoming.data.model.MonthlyTotal
import com.moneycoming.data.repository.AssetsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.YearMonth

class MainViewModel(
    private val repository: AssetsRepository
) : ViewModel() {
    private val selectedMonth = MutableStateFlow(YearMonth.now().toString())

    val month: StateFlow<String> = selectedMonth

    val monthlyAccounts: StateFlow<List<AccountWithBalance>> = selectedMonth
        .flatMapLatest { month -> repository.observeMonthlyAccounts(month) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val monthlyTotals: StateFlow<List<MonthlyTotal>> = repository.observeMonthlyTotals()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun setMonth(month: String) {
        selectedMonth.value = month
    }

    fun addAccount(name: String, type: String) {
        viewModelScope.launch {
            repository.addAccount(name, type)
        }
    }

    fun saveBalance(accountId: Long, amount: Double) {
        viewModelScope.launch {
            repository.upsertMonthlyBalance(accountId, selectedMonth.value, amount)
        }
    }

    companion object {
        fun factory(repository: AssetsRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return MainViewModel(repository) as T
                }
            }
    }
}
