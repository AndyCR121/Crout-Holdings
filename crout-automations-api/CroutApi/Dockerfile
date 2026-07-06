FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY CroutApi/CroutApi.csproj CroutApi/
RUN dotnet restore CroutApi/CroutApi.csproj

COPY CroutApi/ CroutApi/
COPY sql/ sql/

WORKDIR /src/CroutApi
RUN dotnet publish CroutApi.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CroutApi.dll"]
