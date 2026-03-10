package com.moneycoming.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.moneycoming.ui.viewmodel.MainViewModel

@Composable
fun MainScreen(viewModel: MainViewModel) {
    val month by viewModel.month.collectAsState()
    val items by viewModel.monthlyAccounts.collectAsState()
    val totals by viewModel.monthlyTotals.collectAsState()
    var accountName by remember { mutableStateOf("") }
    var accountType by remember { mutableStateOf("Bank") }

    val currentTotal = totals.lastOrNull()?.total ?: 0.0
    val prevTotal = totals.dropLast(1).lastOrNull()?.total ?: 0.0
    val delta = currentTotal - prevTotal

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("MoneyComing", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("当前月份: $month")
        Text("资产总值: %.2f".format(currentTotal))
        Text("较上月变化: %.2f".format(delta))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(value = accountName, onValueChange = { accountName = it }, label = { Text("账户名") })
            OutlinedTextField(value = accountType, onValueChange = { accountType = it }, label = { Text("类型") })
        }
        Button(onClick = {
            if (accountName.isNotBlank()) {
                viewModel.addAccount(accountName, accountType)
                accountName = ""
            }
        }) { Text("新增账户") }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(items, key = { it.accountId }) { item ->
                AccountRow(
                    name = item.accountName,
                    amount = item.amount,
                    onSave = { viewModel.saveBalance(item.accountId, it) }
                )
            }
        }
    }
}

@Composable
private fun AccountRow(name: String, amount: Double, onSave: (Double) -> Unit) {
    var edit by remember(amount) { mutableStateOf(if (amount == 0.0) "" else amount.toString()) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(name, fontWeight = FontWeight.SemiBold)
                Text("当前: %.2f".format(amount))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = edit,
                    onValueChange = { edit = it },
                    label = { Text("金额") }
                )
                Button(onClick = { onSave(edit.toDoubleOrNull() ?: 0.0) }) {
                    Text("保存")
                }
            }
        }
    }
}
