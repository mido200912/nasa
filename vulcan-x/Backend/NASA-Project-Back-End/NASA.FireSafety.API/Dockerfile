FROM mcr.microsoft.com/dotnet/sdk:8.0.428-bookworm-slim AS build
WORKDIR /source
COPY NASA.FireSafety.API/NASA.FireSafety.API.csproj NASA.FireSafety.API/
RUN dotnet restore NASA.FireSafety.API/NASA.FireSafety.API.csproj
COPY NASA.FireSafety.API/ NASA.FireSafety.API/
RUN dotnet publish NASA.FireSafety.API/NASA.FireSafety.API.csproj -c Release --no-restore -o /publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0.34-bookworm-slim AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production ASPNETCORE_HTTP_PORTS=8080
COPY --from=build --chown=app:app /publish .
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["dotnet", "NASA.FireSafety.API.dll", "--healthcheck"]
ENTRYPOINT ["dotnet", "NASA.FireSafety.API.dll"]
