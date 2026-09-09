import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { RoleName, AccountReceivableStatus } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { FinancialService } from "./financial.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { CreateAccountReceivableDto } from "./dto/create-account-receivable.dto";

@Controller("financial")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.FINANCEIRO, RoleName.RECEPCAO)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get("payments")
  findPayments(@Query("serviceOrderId") serviceOrderId?: string) {
    return this.financialService.findPayments(serviceOrderId);
  }

  @Post("payments")
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.financialService.createPayment(dto);
  }

  @Get("accounts-receivable")
  findAccountsReceivable(@Query("status") status?: AccountReceivableStatus) {
    return this.financialService.findAccountsReceivable(status);
  }

  @Post("accounts-receivable")
  createAccountReceivable(@Body() dto: CreateAccountReceivableDto) {
    return this.financialService.createAccountReceivable(dto);
  }

  @Get("closing")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.FINANCEIRO)
  dailyClosing(@Query("date") date: string) {
    return this.financialService.dailyClosing(date);
  }

  @Get("reports/revenue")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.FINANCEIRO)
  revenueReport(@Query("from") from: string, @Query("to") to: string) {
    return this.financialService.revenueReport(from, to);
  }
}
