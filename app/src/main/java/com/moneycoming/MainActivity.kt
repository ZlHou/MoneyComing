package com.moneycoming

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.moneycoming.ui.screen.MainScreen
import com.moneycoming.ui.theme.MoneyComingTheme
import com.moneycoming.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    private val container by lazy { AppContainer(applicationContext) }
    private val viewModel: MainViewModel by viewModels {
        MainViewModel.factory(container.repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MoneyComingTheme {
                MainScreen(viewModel)
            }
        }
    }
}
