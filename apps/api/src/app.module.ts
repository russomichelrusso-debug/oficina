import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CustomersModule } from "./customers/customers.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ServicesModule } from "./services/services.module";
import { MechanicsModule } from "./mechanics/mechanics.module";
import { ServiceOrdersModule } from "./service-orders/service-orders.module";
import { QuotesModule } from "./quotes/quotes.module";
import { DiagnosticsModule } from "./diagnostics/diagnostics.module";
import { ChecklistsModule } from "./checklists/checklists.module";
import { MediaModule } from "./media/media.module";
import { WorkSessionsModule } from "./work-sessions/work-sessions.module";
import { PartsModule } from "./parts/parts.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { StockModule } from "./stock/stock.module";
import { FinancialModule } from "./financial/financial.module";
import { PublicModule } from "./public/public.module";
import { ReportsModule } from "./reports/reports.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({}),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    VehiclesModule,
    DashboardModule,
    RealtimeModule,
    ServicesModule,
    MechanicsModule,
    ServiceOrdersModule,
    QuotesModule,
    DiagnosticsModule,
    ChecklistsModule,
    MediaModule,
    WorkSessionsModule,
    PartsModule,
    SuppliersModule,
    StockModule,
    FinancialModule,
    PublicModule,
    ReportsModule,
  ],
  providers: [
    // Ordem importa: autentica (JWT) e só então autoriza (RBAC).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
